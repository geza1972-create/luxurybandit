"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MapPin, Languages, Mail, Phone, Link2, ChevronDown, Check, Play, Eye, MessageCircle, Trash2, FileText } from "lucide-react";
import { TalentKopf } from "@/components/CI";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import TeilenKnopf from "@/components/TeilenKnopf";
import { KARTE_TEXTE } from "@/components/EinladungKarte";
import ProfilChatEinstieg from "@/components/ProfilChatEinstieg";
import SeitenFuss from "@/components/SeitenFuss";
import MappenKopf from "@/components/MappenKopf";
import { EXECUTIVE_TEXTE, type ExecutiveProfil } from "@/lib/lebenslauf-vorlage";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import type { Lang } from "@/lib/lang";

/**
 * DIE VORLAGE „EXECUTIVE" — DAS FERTIGE BEWERBER-DOSSIER (Owner 22.08.2026: „one template
 * that looks so polished, credible and premium that a professional candidate would
 * immediately want to use it for a real job application" · „It should feel professionally
 * curated." · „I would send this profile to an employer.").
 *
 * DIE EINE ENTWURFS-ENTSCHEIDUNG, AUS DER ALLES ANDERE FOLGT: Der Bewerber ist PAPIER, die
 * Plattform ist der dunkle Raum darum. Der INHALT des Dossiers steht auf EINER
 * durchgehenden elfenbeinfarbenen Fläche (`.lb-karte`), getrennt nur durch Haarlinien, wie
 * die Seiten einer Mappe. SEIT 25.08.2026 GILT DAS NUR FÜR DEN INHALT (Owner, dreimal:
 * „das hat in der karte nichts zu suchen … muss extra drunter"): Alles, womit man HANDELT
 * — Firmen-Chat mit Gesprächsanfrage, Bewerbungs-Assistent, Bewerbungs-Liste, Abo — steht
 * als eigene Boxen UNTER dem Blatt auf dem Dunklen. (Die 24.08.-Ansage „es muss alles in
 * der Karte sein" betraf die INHALTS-Hälfte, die damals unter dem Blatt hing.) Deshalb
 * liest sich die Seite als Dossier und nicht als SaaS-Oberfläche aus lauter Kästen
 * (Auftrag: „not generic SaaS cards everywhere", „The page must feel like a personal
 * professional dossier").
 *
 * WARUM NICHT JE ABSCHNITT EINE KARTE: Sechs Karten untereinander sind sechs Ränder, sechs
 * Schatten und fünf Lücken — das ist die Optik eines Baukastens. Eine Fläche mit Haarlinien
 * ist die Optik eines gedruckten Dokuments. Genau darin liegt der Unterschied zwischen
 * „CV-Builder" und „Executive Search".
 *
 * DIE ZEHN SEKUNDEN (Auftrag: wer ist das · welches Niveau · welche Stärken · welche
 * Erfahrung · lohnt sich der Kontakt): In dieser Reihenfolge steht es auch da. Der Name ist
 * das grösste Element der Seite, das Porträt darüber das einzige Bild, und der Preis dieser
 * Entscheidung — der Kaufknopf des Hauses — hat hier keinen Platz: Diese Seite verkauft
 * nichts, sie stellt jemanden vor.
 *
 * FARBEN: Gold trägt genau ZWEI Dinge — die Wortmarke im Kopf und den einen Knopf „Gespräch
 * anfragen". In der Karte ist der Akzent Tinte (`.lb-karte`-Regeln in globals.css), draussen
 * das gelbe #f6cf51. Kein Verlauf, kein zweites Gold, keine bunten Abzeichen (Skill
 * `ci-design`; Auftrag: „Gold should be used only for emphasis and important actions").
 *
 * KEIN „made by luxurybandit.com" (Memory `lebenslauf-kontaktkarte-ausblendbar`): Was der
 * Bewerber verschickt, gehört ihm. Die Herkunft steht im Kopf, und dort reicht sie.
 *
 * BREITE: Handy zuerst (390–430), am Rechner eine mittige Spalte von 760 (`lb-dossier` in
 * globals.css hebt die 440er-Handy-Spalte des Hauses für genau diese Seite auf) — nie über
 * die ganze Breite gezogen, ein Dossier ist kein Dashboard.
 */

/** Die Haarlinie zwischen zwei Abschnitten desselben Blattes. Tinte auf Elfenbein, in beiden
    Fassungen dieselbe: `.lb-karte` behält ihre Farben, hell wie dunkel (globals.css). */
const LINIE = "border-t border-[#1a160f]/[0.11]";

/** Die kleine Überschrift eines Abschnitts. Gesperrte Versalien in Tinte, nie in Gold — auf
    Papier ist Gold Zierat, und Zierat auf jeder Überschrift ist genau der „excessive gold",
    den der Auftrag ausschliesst. */
function Abschnitt({ children }: { children: string }) {
  return <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-40">{children}</p>;
}

export default function LebenslaufExecutive({ profil, lang = "en", werkzeug, konto, vorKarte, nachKarte, chatStill = false, ohneFirmenTeil = false, fussFrei = false, vorschauAktiv = false }: {
  profil: ExecutiveProfil;
  lang?: Lang;
  /** DER SPIELPLATZ HÄNGT SICH EIN (Owner 25.08.2026, „Ein Gespräch, zwei Türen"):
      `vorKarte` steht ÜBER dem Blatt (das kurze Anschreiben — Owner: „Es müsste oben
      anfangen: ein kurzes Anschreiben auf die Anzeige angepasst, dann drunter das
      Resume"), `nachKarte` direkt unter dem Blatt (Beispiel-Match, Prozent + Analyse,
      der Bewerberberater). `chatStill` lässt den Firmen-Chat bis zur Danke-Zeile
      durchspielen, ohne dass etwas versendet wird (Spielplatz: nichts verlässt den
      Browser). Die echte [id]-Seite reicht nichts davon herein. */
  vorKarte?: ReactNode;
  nachKarte?: ReactNode;
  chatStill?: boolean;
  /** Spielplatz-Bearbeiten-Sicht (Owner: „das kommt doch in der Vorschau"): blendet die
      Firmen-Fläche aus, obwohl der Betrachter kein Besitzer ist — der Spielplatz schaltet
      sie über seine eigene Bearbeiten|Vorschau-Leiste wieder ein. */
  ohneFirmenTeil?: boolean;
  /** Der Spielplatz führt seine eigene Bearbeiten|Vorschau-Leiste und sagt hierüber, dass
      gerade die Firmen-Sicht läuft — dann trägt die Seite denselben Vorschau-Streifen wie
      beim echten Besitzer. */
  vorschauAktiv?: boolean;
  /** Der Spielplatz stellt unten Gold + Bearbeiten|Vorschau fest ins Bild (~120px) —
      dieser Puffer schiebt die Fusszeilen-Links darüber (Owner: „footer links sehe
      ich nicht"), ohne die ganze Seite höher zu machen. */
  fussFrei?: boolean;
  /** BESITZER-WERKZEUG (Owner 24.08.2026: das Korrektur-Feld) — die [id]-Seite reicht es
      herein, das Beispiel nicht. Es rendert als letzter Abschnitt IM Blatt; ob es für den
      Betrachter überhaupt erscheint, entscheidet der Baustein selbst (Besitz-Prüfung). */
  werkzeug?: ReactNode;
  /** DAS KONTO-ZEICHEN (Owner 24.08.2026: „wo kann ich mich hier einloggen und mein Profil
      editieren?") — nur die [id]-Seite reicht `<KontoChip />` herein; das öffentliche
      Muster kennt kein Konto. Landet im Kopf, neben Teilen (siehe TalentKopf). */
  konto?: ReactNode;
}) {
  const T = EXECUTIVE_TEXTE[lang] ?? EXECUTIVE_TEXTE.en;
  const K = KARTE_TEXTE[lang] ?? KARTE_TEXTE.en;
  const vorname = profil.name.split(" ")[0] || profil.name;

  /* ERFAHRUNG EINGEKLAPPT NACH VIER (Owner 24.08.2026, am eigenen 11-Stationen-Profil:
     „nach der vierten Stelle zum Ausklappen mit alles anzeigen") — seit „es muss alles rein"
     (24.08., derselbe Tag) liegen ALLE Stationen im Profil, aber elf Haarlinien-Blöcke
     hintereinander sind kein Zehn-Sekunden-Dossier mehr. Eingeklappt bleibt trotzdem ALLES
     da: ein Tipp zeigt den Rest, nichts geht verloren, nur die erste Ansicht bleibt kurz. */
  const [erfahrungOffen, setErfahrungOffen] = useState(false);

  /**
   * „EIN BEWERBER MUSS SEINE KONTAKTDATEN SEHEN" (Owner 24.08.2026) — `kontaktSichtbar`
   * regelt, was eine FIRMA sieht (das Vermittlungsmodell, siehe lib/lebenslauf-store.ts).
   * Der BESITZER ist keine Firma: Er soll seine eigenen Daten immer sehen, um zu prüfen,
   * dass sie stimmen. Dieselbe Besitz-Prüfung wie die anderen Werkzeuge
   * (`/api/lebenslauf-korrektur` GET, geteilte Logik `darfAmProfilArbeiten`) — SICHER
   * VOREINGESTELLT AUF „NEIN": Bis die Prüfung zurück ist, gilt exakt das, was ein Fremder
   * sähe (kontaktSichtbar); erst eine BESTÄTIGTE Besitzerschaft schaltet mehr frei, nie
   * umgekehrt — ein Fremder darf nie kurz zu viel sehen, ein Besitzer darf ruhig eine
   * halbe Sekunde auf seine eigenen Daten warten.
   */
  const [istBesitzer, setIstBesitzer] = useState(false);
  /* VORSCHAU/BEARBEITEN (Owner 25.08.2026: „zwei Buttons im Footer") — Vorschau zeigt dem
     Besitzer die Seite EXAKT wie ein Fremder sie sieht: keine Werkzeug-Boxen, Kontaktdaten
     nur nach Firmen-Freigabe. Die Leiste selbst bleibt in beiden Ansichten stehen — sie
     ist der garantierte Weg zurück (Memory `immer-close-einbauen`). */
  const [vorschau, setVorschau] = useState(false);
  const besitzerAnsicht = istBesitzer && !vorschau;
  /* DIE KONTAKT-FREIGABE LIEGT BEIM BESITZER (Owner 25.08.2026: „Die Kontaktdaten werden
     im Chat abgefragt. Falls der User sie im Bearbeiten-Modus für alle freigibt.") — der
     Schalter unten im Bearbeiten-Modus; der Firmen-Chat nennt die Daten nur bei Freigabe. */
  const [kontaktFrei, setKontaktFrei] = useState(profil.kontaktSichtbar === true);
  const [freigabeBusy, setFreigabeBusy] = useState(false);

  const ausweis = () => {
    let device = "", pin = "", tok = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    try { pin = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { /**/ }
    try { tok = getStoredAuthSession()?.access_token ?? ""; } catch { /**/ }
    return {
      device,
      headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}), ...(pin ? { "x-try-look-admin-pin": pin } : {}) } as Record<string, string>,
    };
  };

  /* „Noch kein Video."-Zeile nach dem Play-Tipp auf einer Bild-Bewerbung. */
  const [videoWunsch, setVideoWunsch] = useState(false);
  /* Der Video-CTA an der Nachfrage-Zeile: "" | "busy" | "ok". */
  /** Erst eine NEGATIVE Besitz-Prüfung macht diesen Betrachter zum Fremden — nur dann
      zählen View-Beacon und Play-Tipp (Owner: der Besitzer zählt sich nie selbst). */
  const [fremd, setFremd] = useState(false);
  /* DIE BESITZER-ZAHLEN VOM SERVER (Owner 25.08.2026: Interesse-Zaehler und die
     Gespraechsanfragen mit E-Mail) — sie kommen NIE mit dem Server-Render (die Seite ist
     oeffentlich, und in den Anfragen stehen fremde E-Mail-Adressen), sondern erst nach
     BESTAETIGTER Besitzerschaft ueber den darf-gepruefte GET /api/lebenslauf-bewerbung. */
  const [interesseZahl, setInteresseZahl] = useState(0);
  const [anfragen, setAnfragen] = useState<{ id: string; name: string; mail: string; nachricht?: string; datum: string }[]>([]);
  /* Loeschen nach Hausregel (Memory `loeschen-zwei-tipps-rot`): erster Tipp stellt das
     Symbol rot, zweiter loescht, nach 3 s faellt es zurueck. */
  const [anfrageArm, setAnfrageArm] = useState("");

  useEffect(() => {
    const { device, headers } = ausweis();
    fetch(`/api/lebenslauf-korrektur?id=${encodeURIComponent(profil.id)}&device=${encodeURIComponent(device)}`, {
      headers, cache: "no-store",
    }).then(r => r.json()).then(d => {
      if (d?.darf === true) {
        setIstBesitzer(true);
        void fetch(`/api/lebenslauf-bewerbung?id=${encodeURIComponent(profil.id)}&device=${encodeURIComponent(device)}`, { headers, cache: "no-store" })
          .then(r => r.json()).then(b => {
            if (b?.darf !== true) return;
            setInteresseZahl(Number(b.interesseKlicks) || 0);
            if (Array.isArray(b.anfragen)) setAnfragen(b.anfragen);
          }).catch(() => { /* Zeilen bleiben einfach weg */ });
        return;
      }
      setFremd(true);
      /* DER EHRLICHE VIEW (Owner 25.08.2026: „Recruiter haben sich deine Bewerbung
         angeschaut") — gezählt wird genau hier: Besitz-Prüfung fertig UND negativ. */
      void fetch("/api/lebenslauf-view", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profil.id, art: "view" }),
      }).catch(() => { /* ein verlorener Zähler ist kein Fehler */ });
    }).catch(() => { /* bleibt „nein" */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.id]);

  const anfrageLoeschen = (aid: string) => {
    if (anfrageArm !== aid) {
      setAnfrageArm(aid);
      setTimeout(() => setAnfrageArm(v => (v === aid ? "" : v)), 3000);
      return;
    }
    setAnfrageArm("");
    const { device, headers } = ausweis();
    void fetch("/api/lebenslauf-anfrage", {
      method: "DELETE", headers,
      body: JSON.stringify({ id: profil.id, anfrageId: aid, device }),
    }).then(r => r.json()).then(d => {
      if (Array.isArray(d?.anfragen)) setAnfragen(d.anfragen);
    }).catch(() => { /* Reihe bleibt, der Tipp kann erneut */ });
  };

  const freigabeUmschalten = async () => {
    if (freigabeBusy) return;
    setFreigabeBusy(true);
    try {
      const { device, headers } = ausweis();
      const r = await fetch("/api/lebenslauf-kontakt", {
        method: "POST", headers,
        body: JSON.stringify({ id: profil.id, sichtbar: !kontaktFrei, device }),
      });
      if (r.ok) setKontaktFrei(f => !f);
    } catch { /* Zustand bleibt, der Knopf kann erneut */ }
    setFreigabeBusy(false);
  };

  return (
    /* `lb-dossier`: die eine Kennung, an der globals.css die Handy-Spalte für diese Seite
       aufhebt — sonst stünde das Dossier am Rechner in einem 440-px-Telefonrahmen. */
    <main className="lb-bg lb-dossier min-h-screen text-white">
      {/* KEIN MENÜ MEHR (Owner 25.08.2026: „Das Menü brauche ich hier nicht") — das
          Inhaltsverzeichnis war für ein Dokument gedacht, das man liest, indem man
          springt; man liest es aber, indem man scrollt. Der Kopf trägt jetzt nur noch,
          was man wirklich braucht: Marke, Konto, Teilen, Hell/Dunkel, Sprache. */}
      <TalentKopf marke={T.marke} konto={konto}
        teilen={<TeilenKnopf kopf text={`${profil.name} — ${profil.rolle}`}
          label={T.teilen} kopiertLabel={T.kopiert} />}
        menuLabel={T.menu} menuTitel={T.menuTitel} />

      <div className="mx-auto w-full max-w-[440px] px-4 pb-14 pt-3 md:max-w-[760px] md:pt-6">

        {/* DIE VORSCHAU MUSS MAN SOFORT SEHEN (Owner 25.08.2026: „Wenn ich umschalte,
            gibt's erst mal im Sichtbereich keinen Unterschied. Erst beim Runterscrollen")
            — oben sind beide Ansichten zu Recht gleich (die Firma sieht dieselbe Mappe),
            der Unterschied wohnt weiter unten. Dieser Streifen gibt dem Schalter sofort
            eine Antwort und sagt zugleich, WAS die Vorschau ist. `lb-goldhauch` statt
            eines getippten Gold-Hauchs (Memory `lb-goldhauch-klasse`). */}
        {(vorschauAktiv || (istBesitzer && vorschau)) && (
          <p className="lb-goldhauch mb-3 flex items-center gap-2 rounded-full border border-[#f6cf51]/40 px-4 py-2 text-[11.5px] font-black text-white/85">
            <Eye className="h-4 w-4 shrink-0 text-[#f6cf51]" />{T.vorschauStreifen}
          </p>
        )}

        {vorKarte}

        {/* ─────────────────────────── DAS BLATT ─────────────────────────── */}
        <article className="lb-karte overflow-hidden rounded-[20px] shadow-[0_18px_50px_rgba(0,0,0,0.38)]">

          {/* DAS KOPFBAND (Owner 25.08.2026: „fetter Titel … layoutmässig bombe … wo sind
              die Ornamente?") — dieses Blatt ist DER LEBENSLAUF der Mappe; das Anschreiben
              liegt als eigenes Blatt darüber (vorKarte). */}
          <MappenKopf icon={FileText} titel={T.mappeLebenslauf} teaser={T.mappeLebenslaufTeaser} />

          {/* HERO — Porträt, und das Porträt IST das Video (Auftrag: „Integrate it elegantly
              into the hero rather than making a separate ugly video block").
              Das Bild sitzt mit Rand im Papier statt randlos: So wirkt es wie eine montierte
              Aufnahme in einer Mappe, nicht wie ein Kopfbild einer App.

              AM RECHNER ZWEISPALTIG, UND ZWAR AUS EINEM GEMESSENEN GRUND (22.08.2026, 1280×860):
              Untereinander ist das 4:5-Porträt in der 728er-Spalte 850 Pixel hoch — der Name
              stand damit UNTER dem ersten Bildschirm, und die eine Regel des Auftrags („The
              candidate name and professional positioning must immediately dominate the
              hierarchy") war genau am grossen Bildschirm verletzt. Nebeneinander ist es ausserdem
              die Form, die eine Zeitschrift für ein Porträt wählt: Bild links, Name und Rolle
              rechts daneben. Am Handy bleibt es gestapelt — dort ist untereinander die einzige
              Möglichkeit, und das Bild darf gross sein. */}
          <div className={`${LINIE} p-4 md:flex md:items-center md:gap-7 md:p-7`}>
            {/* Ohne Video UND ohne Foto (Altprofile vor dem 24.08.2026) fällt das Porträt
                weg, statt ein leeres <img> zu zeigen — der Name trägt die Seite dann allein. */}
            {(profil.videoUrl || profil.portraitUrl) && (
            <div className="relative md:w-[300px] md:shrink-0">
              {profil.videoUrl ? (
                <EinladungAnsicht id={profil.id} videoUrl={profil.videoUrl} poster={profil.portraitUrl || undefined}
                  zaehlen={false} schleife={false} originalton musik=""
                  /* Sprechvideo: oben ankern, sonst schneidet die 4:5-Flaeche den Kopf ab
                     (Owner 24.08.2026; Skill `card`). */
                  verhaeltnis="aspect-[4/5]" ausrichtung="oben"
                  tonText={K.ton} tonAusText={K.tonAus} grossText={K.gross} kleinText={K.klein} />
              ) : (
                /* DIE BILD-BEWERBUNG TRÄGT TROTZDEM EINEN PLAY-KNOPF (Owner 25.08.2026:
                   „Das wäre doch toll, wenn auf dem Bild ein Play-Button steht und die
                   Meldung kommt: Noch kein Video — aber der Bewerber sieht: 3 Leute
                   wollten dein Video sehen"). Der Tipp zählt nur bei bestätigten Fremden
                   und ist damit der ehrlichste Kauf-Trigger fürs Video. */
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[14px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {/* object-top wie beim Video darüber — Porträt nie mittig schneiden
                      (Skill `card`, 24.08.2026). */}
                  <img src={profil.portraitUrl} alt={profil.name} className="h-full w-full object-cover object-top" />
                  {/* DER HAUS-PLAYKNOPF, nicht nachgebaut (Owner 05.08.2026 an der ersten
                      grossen Scheibe: „der Play-Button ist billig, muss kleiner sein und
                      halbtransparent" — exakt das Markup aus EinladungAnsicht: 40-px-
                      milchige Scheibe, dünner weisser Rand, weisses Dreieck, 48-px-
                      Tippfläche; `data-aufmedien` hält das Weiss in der Karte). */}
                  <button type="button" aria-label="Play"
                    onClick={() => {
                      setVideoWunsch(true);
                      if (fremd) {
                        void fetch("/api/lebenslauf-view", {
                          method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: profil.id, art: "video" }),
                        }).catch(() => { /**/ });
                      }
                    }}
                    className="absolute left-1/2 top-1/2 z-10 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center transition active:scale-95">
                    <span data-aufmedien="1" className="grid h-10 w-10 place-items-center rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.22)",
                        border: "1px solid rgba(255,255,255,0.65)",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.28)",
                        backdropFilter: "blur(2px)",
                        WebkitBackdropFilter: "blur(2px)",
                        opacity: 0.85,
                      }}>
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="ml-[2px] h-[18px] w-[18px]"
                        style={{ color: "#fff", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}>
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </button>
                  {videoWunsch && (
                    <span data-aufmedien="1" className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em]"
                      style={{ background: "rgba(12,10,8,0.65)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}>
                      {T.nochKeinVideo}
                    </span>
                  )}
                </div>
              )}
              {/* Die Aufschrift auf dem Video — links unten, wo keiner der drei Karten-Knöpfe
                  sitzt (Skill `card`: sie stehen rechts in einer Spalte). `pointer-events-none`,
                  damit der Tipp auf das Video durchgeht und es gross macht.
                  `data-aufmedien="1"` IST HIER PFLICHT UND KEIN SCHMUCK (gemessen, 22.08.2026):
                  Ich hatte `lb-onmedia` genommen — die Klasse gilt aber nur in der HELLEN
                  Fassung (`.lb-theme .lb-onmedia`). Im Dunkeln gewann `.lb-karte span
                  { color:#2a231c !important }`, und die Aufschrift stand braun auf braunem
                  Schleier, also unlesbar (Memory `lb-karte-important-frisst-inline-farben`).
                  `[data-aufmedien]` ist der Haken, den die Karte selbst für Bedienung AUF dem
                  Video vorsieht: weiss, in beiden Fassungen. */}
              {profil.videoUrl && profil.videoLabel && (
                <span data-aufmedien="1" className="pointer-events-none absolute bottom-3 left-3 z-30 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
                  style={{ background: "rgba(12,10,8,0.55)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}>
                  {profil.videoLabel}
                </span>
              )}
            </div>
            )}

          {/* NAME UND POSITIONIERUNG — die Hierarchie der ganzen Seite steht in diesen zwei
              Zeilen. Serife, weil sie zum Papier gehört (die zweite und einzige zweite Schrift
              des Hauses, Skill `ci-design`), gesperrte Versalien, weil ein Name in einem
              Dossier eine Auszeichnung ist und keine Überschrift.
              `px-1` am Handy: Der Kasten sitzt jetzt IM Hero-Rahmen (p-4), zusammen ergibt das
              wieder die 20 Pixel Rand der Abschnitte darunter. */}
          <div className="px-1 pb-1 pt-5 md:min-w-0 md:flex-1 md:px-0 md:pb-0 md:pt-0">
            <h1 className="font-serif text-[30px] font-black uppercase leading-[1.02] tracking-[0.02em] md:text-[40px]">
              {profil.name}
            </h1>
            <p className="mt-2 text-[14px] font-bold leading-snug opacity-80 md:text-[16px]">{profil.rolle}</p>

            {/* NUR GEFÜLLTE ZEILEN (24.08.2026, seit echte Profile hier ankommen): Die
                Auswertung liefert nicht immer Ort und Sprachen — ein Icon vor leerem Text
                sähe kaputt aus, und eine leere Zeile trüge trotzdem ihre Haarlinie. */}
            {(profil.ort || profil.sprachenKurz) && (
              <div className={`mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3.5 ${LINIE}`}>
                {profil.ort && (
                  <span className="flex items-center gap-1.5 text-[11.5px] font-bold opacity-60">
                    <MapPin className="h-3.5 w-3.5" />{profil.ort}
                  </span>
                )}
                {profil.sprachenKurz && (
                  <span className="flex items-center gap-1.5 text-[11.5px] font-bold opacity-60">
                    <Languages className="h-3.5 w-3.5" />{profil.sprachenKurz}
                  </span>
                )}
              </div>
            )}

            {/* DER STATUS — leise, aber vorhanden (Auftrag: „Include a subtle status"). Ein
                Punkt und ein Wort; kein farbiges Abzeichen, keine Fläche. */}
            {profil.verfuegbar && (
              <p className="mt-3.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] opacity-75">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#2f7d4f]" />
                {profil.verfuegbar}
              </p>
            )}

            {/* DIE DREI, VIER SCHWERPUNKTE — dünn umrandet, klein, in einer Reihe. Sie sind
                Etiketten, keine Knöpfe (Skill `ci-design`: „Ein Chip darf nicht wie ein Button
                aussehen"), deshalb weder gefüllt noch farbig. */}
            {profil.schwerpunkte.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {profil.schwerpunkte.map(s => (
                  <span key={s} className="rounded-full border border-[#1a160f]/25 px-2 py-1 text-[9.5px] font-black uppercase tracking-[0.04em] opacity-75">
                    {s}
                  </span>
                ))}
              </div>
            )}
            </div>
          </div>

          {/* PROFIL — der Fliesstext der Seite, in der HAUS-SANS (Owner 24.08.2026: „ich
              finde die Serifenschrift sehr anstrengend zu lesen" — die Serife bleibt nur
              als Auszeichnung auf Name und Überschriften, nie mehr auf Lesetext). Die
              grosszügige Zeilenhöhe bleibt: Er ist das Einzige, was am Stück gelesen wird. */}
          {profil.profil && (
            <section id="profil" className={`px-5 py-6 md:px-8 md:py-7 ${LINIE}`}>
              <Abschnitt>{T.profil}</Abschnitt>
              <p className="mt-3 text-[14.5px] font-medium leading-[1.65] opacity-85 md:text-[16px]">{profil.profil}</p>
            </section>
          )}

          {/* KERNKOMPETENZEN — ein gesetztes Raster statt bunter Abzeichen (Auftrag: „Do NOT
              create huge colorful badges"). Zwei Spalten am Handy, drei am Rechner; jede Zeile
              trägt nur ihre Haarlinie. */}
          {profil.expertise.length > 0 && (
            <section id="expertise" className={`px-5 py-6 md:px-8 md:py-7 ${LINIE}`}>
              <Abschnitt>{T.expertise}</Abschnitt>
              <ul className="mt-3 grid grid-cols-2 gap-x-5 md:grid-cols-3">
                {profil.expertise.map(e => (
                  <li key={e} className={`py-2.5 text-[12.5px] font-bold leading-snug opacity-80 ${LINIE}`}>{e}</li>
                ))}
              </ul>
            </section>
          )}

          {/* ERFAHRUNG — Rolle gross, Firma und Zeitraum in einer Zeile darunter, ein Satz
              Ergebnis. „Es muss alles rein" (24.08.2026) heisst: alle Stationen sind DA —
              aber nur die ersten vier stehen offen, der Rest hinter „+N weitere anzeigen"
              (Owner, am eigenen 11-Stationen-Profil: „nach der vierten Stelle zum
              Ausklappen"). Vier oder weniger Stationen zeigen den Knopf gar nicht erst. */}
          {profil.erfahrung.length > 0 && (() => {
            const GRENZE = 4;
            const sichtbar = erfahrungOffen ? profil.erfahrung : profil.erfahrung.slice(0, GRENZE);
            const rest = profil.erfahrung.length - GRENZE;
            return (
            <section id="erfahrung" className={`px-5 py-6 md:px-8 md:py-7 ${LINIE}`}>
              <Abschnitt>{T.erfahrung}</Abschnitt>
              <div className="mt-1">
                {sichtbar.map((e, i) => (
                  <div key={`${e.rolle}-${e.zeitraum}`} className={`pb-4 pt-4 ${i === 0 ? "" : LINIE}`}>
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-[15px] font-black leading-tight md:text-[16px]">{e.rolle}</p>
                      <p className="shrink-0 text-[10.5px] font-black uppercase tracking-[0.1em] opacity-45">{e.zeitraum}</p>
                    </div>
                    {/* Echte Profile kennen Firma/Ergebnis nicht immer — leere Absätze
                        wären unsichtbare Lücken im Papier (24.08.2026). */}
                    {e.firma && <p className="mt-1 text-[12px] font-bold opacity-60">{e.firma}</p>}
                    {e.ergebnis && <p className="mt-2 text-[12.5px] leading-snug opacity-75">{e.ergebnis}</p>}
                  </div>
                ))}
              </div>
              {rest > 0 && (
                <button type="button" onClick={() => setErfahrungOffen(o => !o)}
                  className={`mt-3 flex items-center gap-1.5 pt-3 text-[11.5px] font-black uppercase tracking-[0.1em] opacity-60 transition hover:opacity-100 ${LINIE}`}>
                  {erfahrungOffen ? T.wenigerAnzeigen : T.alleAnzeigen(rest)}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${erfahrungOffen ? "rotate-180" : ""}`} />
                </button>
              )}
              {profil.cvUrl && (
                <p className={`pt-3 text-[11.5px] font-bold italic opacity-50 ${LINIE}`}>{T.ganzeCv}</p>
              )}
            </section>
            );
          })()}

          {/* AUSGEWÄHLTE ERGEBNISSE — drei Zahlen, jede mit ihrer Zeile. Die Zahl in der
              Serife und gross: Sie ist der Beleg, auf den ein Personaler zeigt. */}
          {profil.impact.length > 0 && (
            <section className={`px-5 py-6 md:px-8 md:py-7 ${LINIE}`}>
              <Abschnitt>{T.impact}</Abschnitt>
              <div className="mt-1">
                {profil.impact.map((z, i) => (
                  /* Zahl LINKS in fester Spalte, Zeile DANEBEN — nicht rechtsbündig gegenüber
                     (gemessen, 22.08.2026): Rechtsbündig brach erst die Zahl um und dann die
                     Zeile, zwei ausgefranste Ränder, die aufeinander zeigen.
                     UND DIE ZAHL IST EINE ZAHL: „Team of 6" sprengte die Spalte und klebte an
                     seiner eigenen Beschriftung. Was der Lebenslauf sagt, steht jetzt getrennt
                     — „6" in der Spalte, „People led" in der Zeile. Ein Kennwert-Block, in dem
                     ein Feld ein Satz ist, ist kein Kennwert-Block. */
                  <div key={z.zahl} className={`flex items-baseline gap-4 py-3.5 ${i === 0 ? "" : LINIE}`}>
                    <p className="w-[92px] shrink-0 whitespace-nowrap pr-3 font-serif text-[26px] font-black leading-none md:w-[120px] md:text-[30px]">{z.zahl}</p>
                    <p className="text-[11px] font-bold uppercase leading-snug tracking-[0.08em] opacity-60">{z.text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* AUSBILDUNG UND SPRACHEN — sichtbar, aber zweitrangig (Auftrag: „Compact section …
              visible but secondary"): kleinere Schrift, zwei Spalten am Rechner. Echte
              Profile kennen beides oft nicht — dann fällt der ganze Abschnitt weg, statt
              als leerer 50-px-Streifen mit Haarlinie im Blatt zu stehen (gemessen 24.08.). */}
          {(profil.ausbildung.length > 0 || profil.sprachen.length > 0) && (
          <section className={`grid gap-6 px-5 py-6 md:grid-cols-2 md:px-8 md:py-7 ${LINIE}`}>
            {profil.ausbildung.length > 0 && (
              <div>
                <Abschnitt>{T.bildung}</Abschnitt>
                <div className="mt-1">
                  {profil.ausbildung.map((a, i) => (
                    <div key={a.titel} className={`py-3 ${i === 0 ? "" : LINIE}`}>
                      <p className="text-[12.5px] font-black leading-snug">{a.titel}</p>
                      <p className="mt-0.5 text-[11.5px] font-bold opacity-55">{a.ort}</p>
                      <p className="mt-0.5 text-[10.5px] font-black uppercase tracking-[0.1em] opacity-40">{a.zeitraum}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {profil.sprachen.length > 0 && (
              <div>
                <Abschnitt>{T.sprachen}</Abschnitt>
                <div className="mt-1">
                  {profil.sprachen.map((s, i) => (
                    <div key={s.sprache} className={`flex items-baseline justify-between gap-4 py-3 ${i === 0 ? "" : LINIE}`}>
                      <p className="text-[12.5px] font-black">{s.sprache}</p>
                      <p className="text-[11.5px] font-bold opacity-55">{s.niveau}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
          )}
        </article>

        {nachKarte}

        {/* ─────────── UNTER DER KARTE: DIE FUNKTIONEN (Owner 25.08.2026, dreimal
            hintereinander: „das hat in der karte nichts zu suchen. Das ist eine Funktion
            für die Firmen und muss extra drunter" · „das ebenso" · „auch das muss in
            einer extra box drunter"). Das Blatt oben ist NUR das Dokument des Bewerbers —
            alles, womit man HANDELT, steht hier auf dem Dunklen: zuerst die Firmen-Fläche
            (Chat mit Gespräch anfragen/Nachricht/Lebenslauf, dann die Kontaktdaten nach
            Freigabe), darunter die Besitzer-Boxen (jede bringt ihre eigene Karten-Hülle
            mit und bleibt für Fremde unsichtbar). ─────────── */}
        {/* NUR IN DER FIRMEN-SICHT (Owner 25.08.2026: „beim Bearbeiten kommt interesse an
            Geza raus") — Fremde sehen sie immer, der Besitzer nur in der Vorschau.
            KEINE Kontaktdaten mehr auf der Seite (Owner: „werden hier nicht angezeigt") —
            wer sie will, fragt den Chat, und der nennt sie nur nach Freigabe. */}
        {!besitzerAnsicht && !ohneFirmenTeil && (
        <section id="kontakt" className="mt-8 md:mt-10">
          <h2 className="font-serif text-[22px] font-black leading-tight md:text-[26px]">{T.interessiert(vorname)}</h2>
          <p className="mt-2 text-[12.5px] font-bold leading-snug opacity-70">{T.interessiertText}</p>

          <ProfilChatEinstieg
            texte={{
              frage: T.interessiert(vorname), ja: T.ja, nein: T.nein,
              frageWer: T.frageWer, frageMail: T.frageMail, frageNachricht: T.frageNachricht,
              frageLeiten: T.frageLeiten(vorname),
              ohneNachricht: T.ohneNachricht, neinAntwort: T.neinAntwort,
              danke: T.anfrageDanke, zu: T.anfrageZu,
              platzhalter: T.chatFrageP, phName: T.anfrageName, phMail: T.anfrageEmail, phNachricht: T.anfrageNachricht,
              senden: T.chatSenden, denkt: T.chatDenkt,
            }}
            kandidat={profil.name} profilId={profil.id} still={chatStill}
            onInteresse={fremd ? () => {
              void fetch("/api/lebenslauf-view", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: profil.id, art: "interesse" }),
              }).catch(() => { /* ein verlorener Zaehler ist kein Fehler */ });
            } : undefined} />
        </section>
        )}

        {/* DIE EHRLICHEN ZÄHLER FÜR DEN BESITZER (Owner 25.08.2026: „Es müssen irgendwo
            die Views stehen … Recruiter haben sich deine Bewerbung angeschaut" · „Video
            ist gefragt. Erstelle jetzt ein Video…") — still auf dem Dunklen, direkt
            unter der Karte; der Video-Anstoss erscheint nur, solange KEIN Video da ist. */}
        {besitzerAnsicht && ((profil.viewCount ?? 0) > 0 || (profil.videoKlicks ?? 0) > 0 || interesseZahl > 0 || anfragen.length > 0) && (
          <div className="mt-6 flex flex-col gap-1.5">
            {(profil.viewCount ?? 0) > 0 && (
              <p className="flex items-center gap-2 text-[13px] font-bold text-white/75">
                <Eye className="h-4 w-4 shrink-0 text-white/45" />{T.statsOeffnungen(profil.viewCount ?? 0)}
              </p>
            )}
            {/* "1 Person hat Interesse gezeigt." (Owner 25.08.2026) — erster Griff zum
                Firmen-Chat (Ja-Chip oder erstes Tippen), gezaehlt nur bei Fremden. */}
            {interesseZahl > 0 && (
              <p className="flex items-center gap-2 text-[13px] font-bold text-white/75">
                <MessageCircle className="h-4 w-4 shrink-0 text-white/45" />{T.statsInteresse(interesseZahl)}
              </p>
            )}
            {/* "1 Person will dich kontaktieren — E-Mail anzeigen. Auch loeschen dann."
                (Owner 25.08.2026): jede ABGESCHLOSSENE Gespraechsanfrage als Reihe mit
                Name und E-Mail; Loeschen nach Hausregel zwei Tipps, rot. */}
            {anfragen.length > 0 && (
              <>
                <p className="flex items-center gap-2 text-[13px] font-black text-white/90">
                  <Mail className="h-4 w-4 shrink-0 text-[#f6cf51]" />{T.statsAnfragen(anfragen.length)}
                </p>
                {anfragen.map(a => (
                  <div key={a.id} className="ml-6 flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-white/80">
                      {a.name} — <span className="select-all text-white">{a.mail}</span>
                    </p>
                    <button type="button" onClick={() => anfrageLoeschen(a.id)} aria-label="Anfrage löschen"
                      className={`shrink-0 p-1 transition ${anfrageArm === a.id ? "text-[#dc2626]" : "text-white/40 hover:text-white/75"}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </>
            )}
            {(profil.videoKlicks ?? 0) > 0 && !profil.videoUrl && (
              <>
                {/* DER CTA AN DER NACHFRAGE (Owner 25.08.2026, in drei Zügen: „das mit
                    Call to Action versehen" · „nein, nicht als Button, als Text link" ·
                    „link führt doch zur erstellung … Es führt zum Tunel.") — die
                    Aufforderung ist der SCHLUSS DES SATZES SELBST, unterstrichen, und
                    führt als echte Verweisung in den Tunnel: `?video=<kennung>` steigt
                    dort direkt beim Video-Teil ein (Skript → Aufnahme → fertigstellen
                    hängt das Video an DIESE Bewerbung und führt hierher zurück). Keine
                    Concierge-Mail mehr — die Erstellung IST der Weg. */}
                <p className="flex items-start gap-2 text-[13px] font-black text-white/90">
                  <Play className="mt-0.5 h-4 w-4 shrink-0 text-[#f6cf51]" />
                  <span>
                    {T.statsVideoWunsch(profil.videoKlicks ?? 0)}{" "}
                    <a href={`/themes/lebenslauf/start?video=${profil.id}`}
                      className="font-black text-white underline decoration-white/45 underline-offset-4 transition hover:decoration-white">
                      {T.videoCta}
                    </a>
                  </span>
                </p>
              </>
            )}
          </div>
        )}

        {/* DIE BESITZER-BOXEN — jede bringt ihre eigene `lb-karte`-Hülle mit; ob überhaupt
            etwas erscheint, entscheidet der Baustein selbst nach der Besitz-Prüfung. In der
            VORSCHAU verschwinden sie komplett — das ist ihr Zweck. */}
        {besitzerAnsicht && werkzeug}

        {/* KONTAKTDATEN NUR IM BEARBEITEN-MODUS (Owner 25.08.2026: „die Kontaktdaten werden
            hier nicht angezeigt, nur im Bearbeiten-Modus") — mit dem FREIGABE-SCHALTER:
            Erst wenn der Bewerber freigibt, nennt der Firmen-Chat sie auf Nachfrage. */}
        {besitzerAnsicht && profil.kontakt && (
          <section className="lb-karte mt-5 overflow-hidden rounded-[20px] px-5 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.38)] md:px-8 md:py-7">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-40">{T.kontakt}</p>
            <div className="mt-3 flex flex-col gap-2">
              {profil.kontakt.ort && (
                <p className="flex items-center gap-2.5 text-[12.5px] font-bold opacity-80"><MapPin className="h-4 w-4 shrink-0" />{profil.kontakt.ort}</p>
              )}
              {profil.kontakt.telefon && (
                <p className="flex items-center gap-2.5 text-[12.5px] font-bold opacity-80"><Phone className="h-4 w-4 shrink-0" />{profil.kontakt.telefon}</p>
              )}
              {profil.kontakt.email && (
                <p className="flex items-center gap-2.5 text-[12.5px] font-bold opacity-80"><Mail className="h-4 w-4 shrink-0" />{profil.kontakt.email}</p>
              )}
              {profil.kontakt.profilLink && (
                <p className="flex items-center gap-2.5 text-[12.5px] font-bold opacity-80"><Link2 className="h-4 w-4 shrink-0" />{profil.kontakt.profilLink}</p>
              )}
            </div>
            {/* ZWEI WAHLEN MIT HÄKCHEN (Owner 25.08.2026: „mit Häkchen Öffentlich sichtbar
                oder nur per Anfrage" — und zur ersten Fassung: „die Checkboxen sind beide
                voll und Grün ist nicht gut"). Deshalb das Haus-Chip-Muster in TINTE: Die
                GEWÄHLTE Zeile trägt vollen Rand + Häkchen, die andere nur den leisen Rand
                und GAR KEIN Symbol — zwei ähnliche Kreise waren nicht unterscheidbar, weil
                die Karte Symbol-Deckkraft per !important überschreibt (Memory
                `lb-karte-important-frisst-inline-farben`). Fester Häkchen-Platz, damit
                die Wahl nichts verschiebt (Hausregel „Auswahl verschiebt NIE"). */}
            <div className="mt-4 flex flex-col gap-2">
              {[
                { wert: true, label: T.kontaktOeffentlich },
                { wert: false, label: T.kontaktNurAnfrage },
              ].map(w => {
                const aktiv = kontaktFrei === w.wert;
                return (
                  <button key={String(w.wert)} type="button" disabled={freigabeBusy}
                    onClick={() => { if (!aktiv) void freigabeUmschalten(); }}
                    className={`flex h-11 items-center gap-2.5 rounded-full px-4 text-left text-[13px] font-black transition disabled:opacity-40 ${aktiv ? "border-2 border-[#1a160f] bg-[#1a160f]/[0.05]" : "border border-[#1a160f]/25 opacity-60 hover:opacity-90"}`}>
                    <span className="w-4 shrink-0">{aktiv && <Check className="h-4 w-4" />}</span>
                    {w.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] font-bold leading-snug opacity-45">
              {kontaktFrei ? T.kontaktFreigegeben : T.kontaktNurDu}
            </p>
          </section>
        )}
      </div>

      {/* DIE BESITZER-LEISTE — STICKY UNTEN (Owner 25.08.2026: „zwei Buttons im Footer
          Vorschau und Bearbeiten" · „sticky unten"). Nur der Besitzer sieht sie; die
          aktive Ansicht trägt Weiss, kein Gold (das eine Gold der Seite gehört der
          Gesprächsanfrage, Skill `ci-design`). */}
      {istBesitzer && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
          {/* Bearbeiten links, Vorschau RECHTS (Owner 25.08.2026: „vorschau rechts"). */}
          <div className="flex items-center gap-1 rounded-full border border-white/25 bg-[#0c0a08]/90 p-1 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur">
            <button type="button" onClick={() => setVorschau(false)}
              className={`h-10 rounded-full px-5 text-[12px] font-black uppercase tracking-[0.08em] transition ${vorschau ? "text-white/70 hover:text-white" : "bg-white text-[#0c0a08]"}`}>
              {T.bearbeiten}
            </button>
            <button type="button"
              onClick={() => { setVorschau(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className={`h-10 rounded-full px-5 text-[12px] font-black uppercase tracking-[0.08em] transition ${vorschau ? "bg-white text-[#0c0a08]" : "text-white/70 hover:text-white"}`}>
              {T.vorschau}
            </button>
          </div>
        </div>
      )}
      {/* Platz, damit die Leiste die Fusszeilen-Links nie verdeckt. Ein Puffer VOR dem
          Fuss hebt die Links nicht an (der Fuss bleibt das letzte Element) — bei
          fussFrei (Spielplatz) bekommt darum der FUSS selbst unten Luft, siehe
          className unten. */}
      {istBesitzer && <div aria-hidden className="h-16" />}

      {/* NUR DAS GESETZLICHE MINIMUM (Owner 24.08.2026: „auf der Bewerbeseite müssen die
          Links unten raus, auch Instagram und Facebook") — Impressum/Datenschutz/AGB müssen
          in der EU erreichbar bleiben, alles andere (Contact, About, Social, ©) ist auf
          einer Seite an Personalabteilungen Werbung und fliegt. */}
      <SeitenFuss art="schlicht" className={`md:max-w-[760px]${fussFrei ? " pb-24" : ""}`} />
    </main>
  );
}
