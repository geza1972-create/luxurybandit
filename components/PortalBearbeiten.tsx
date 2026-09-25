"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import StimmeAufnehmen from "@/components/StimmeAufnehmen";
import WerkFilmHochladen from "@/components/WerkFilmHochladen";
import { Camera, ImagePlus, LayoutDashboard, Sparkles, Undo2, Crop } from "lucide-react";

/**
 * ── WIE VIELE WERKE EINER ZEIGEN DARF (Owner 13.09.2026: „wenn der User versucht, mehr als 10
 * hochzuladen … Im Button wie ich dir gesagt habe 8/10") ────────────────────────────────────
 *
 * ZEHN, WEIL DER TRICHTER ZEHN VERSPRICHT („Încarcă până la 10 lucrări"). Bis heute standen hier
 * dreizehn — die Zahl war nirgends gemeinsam festgelegt, sondern dreimal einzeln hingeschrieben
 * (Trichter 10, Formular 13, Route 11+1). Deshalb hat Gerry zwölf Werke: Niemand hat etwas
 * falsch gemacht, die Grenzen liefen auseinander.
 *
 * BESTAND BLEIBT. Wer schon mehr hat, verliert nichts: Die Route nimmt weiterhin bis zu
 * dreizehn Kacheln an, sonst wären Gerrys zwölf beim nächsten Speichern zwei weniger. Er kann
 * nur nichts Neues hinzufügen, bis er selbst welche entfernt. (Stand 13.09.2026: Gerry und
 * Szidonia haben je zwölf, Claudiu genau zehn.)
 *
 * ── UND HIER KOMMT PREMIUM HIN (Owner 13.09.2026: „wir werden genau hier Premium anbieten") ──
 *
 * Diese Zahl ist deshalb KEINE beliebige technische Schranke, sondern die Grenze zwischen dem,
 * was kostenlos ist, und dem, was später Geld kostet. Wer sie ändert, verschiebt ein
 * Preismodell — nicht eine Einstellung.
 *
 * SOLANGE ES PREMIUM NICHT GIBT, WIRD ES AUCH NICHT ANGEDEUTET: Der volle Knopf sagt schlicht,
 * dass die Plätze belegt sind. Ein Hinweis auf ein Angebot, das noch nirgendwohin führt,
 * verbrennt genau den Augenblick, in dem jemand zahlungsbereit wäre.
 */
/* ── DIE GRENZE HÄNGT AM ABO (18.09.2026) ───────────────────────────────────────────────────
   Hier stand eine feste 10 — also sah auch ein Künstler mit Premium „3/10" und stiess bei zehn
   Werken an eine Wand, die es für ihn gar nicht gibt. Die Zahlen stehen in `versusforge-abo.ts`
   (10 ohne, 25 mit Abo) und werden vom Server beim Speichern genauso gerechnet. */
import type { PortalTexte } from "@/lib/lakatosbandi-texte";
import MandantKaufen from "@/components/MandantKaufen";
import { DRUCK_KUENSTLER_CENTS } from "@/lib/lakatosbandi-druck";
import { WERKE_ABO, WERKE_FREI } from "@/lib/versusforge-abo";
import { eur } from "@/lib/pricing";

/**
 * SEINE SEITE, DIREKT BEARBEITET — WYSIWYG (Owner 11.09.2026: „Dann wird er den Link bekommen, dass er öffnen
 * und es ergänzen kann. Profilbild hochladen, Text über sich, wenn er auf ‚Edit Webseite' klickt. Dort müssen
 * sofort alle Bilder zu sehen sein. Platzhalter für Künstlerbild, Name" · „er muss es dort bearbeiten. WYSIWYG").
 *
 * DIESELBE SEITE WIE FÜR KÄUFER, NUR ANTIPPBAR: Foto, Name, Ort, Über mich, jede Kachel mit Bild, Spruch und
 * Titel · Technik · Größe · Jahr. Kein Formular daneben — er sieht beim Tippen, was Käufer sehen.
 *
 * BILDER GEHEN SOFORT HOCH (über `api/versusforge-bild`, mit der Inhaltsprüfung). Die Texte sammelt „Speichern".
 */

type Kachel = { i: number; spruch: string; titel: string; technik: string; groesse: string; jahr: string; geschichte: string; preis: string; detalii: string; vertritt: boolean; poster: boolean; kunst: boolean; stimme?: boolean; stimmeAm?: string; sprecher?: boolean; nurStimme?: boolean; youtube?: string;
  /* Ob an diesem Werk schon ein Film hängt (Owner 20.09.2026) — die Geschichte und „an die Wand". */
  film?: boolean; filmAm?: string; wandFilm?: boolean; wandFilmAm?: string };

async function verkleinern(f: File): Promise<string> {
  const bitmap = await createImageBitmap(f);
  const breit = Math.min(1080, bitmap.width);
  const hoch = Math.round((bitmap.height / bitmap.width) * breit);
  const flaeche = document.createElement("canvas");
  flaeche.width = breit;
  flaeche.height = hoch;
  flaeche.getContext("2d")?.drawImage(bitmap, 0, 0, breit, hoch);
  return flaeche.toDataURL("image/jpeg", 0.85);
}

export default function PortalBearbeiten({ mandant, k, T, lang, aufbau = false, oeffentlich, start }: {
  mandant: string;
  k: string;
  T: PortalTexte;
  /* Nur für die Zahlenformatierung („20 €" / „20 €") — die Texte kommen aus `T`. */
  lang: string;
  /**
   * Seine Inhalte werden gerade angelegt (`aufbauSeit` am Datensatz) — die Bilder sind da, die
   * Sätze entstehen in diesem Augenblick im Hintergrund. Solange das läuft, sagt die Seite es
   * ihm und lädt sich selbst nach, bis es fertig ist (Owner 12.09.2026: „er sieht die Meldung
   * mit ‚deine Inhalte werden angelegt' … und dann tatataa").
   */
  aufbau?: boolean;
  /** Die Adresse seiner Seite ohne Schlüssel — so sehen Käufer sie. */
  oeffentlich: string;
  start: {
    name: string; ort: string; ueberMich: string; preisSpanne: string; profilBild: boolean; frei: boolean;
    /* Seine sozialen Adressen — freiwillig, deshalb optional (Owner 13.09.2026). */
    instagram?: string; facebook?: string; posterViu?: boolean; abo?: boolean;
    /* Die EINE Aufnahme des Künstlers (Owner 18.09.2026) — nicht mehr je Werk. */
    stimme?: boolean; sprecher?: boolean; stimmeAm?: string; youtube?: string; stimmeSkript?: string;
    kacheln: Kachel[];
  };
}) {
  const [name, setName] = useState(start.name);
  const [ort, setOrt] = useState(start.ort);
  const [ueberMich, setUeberMich] = useState(start.ueberMich);
  /* Was seine Werke kosten — EIN Satz für alle Bilder (Owner 12.09.2026). */
  const [preisSpanne, setPreisSpanne] = useState(start.preisSpanne);
  /* Seine sozialen Adressen (Owner 13.09.2026) — freiwillig, hier gepflegt und nicht in den
     Einstellungen: Dort stehen Impressum und Datenschutz, die einen Künstler nichts angehen. */
  /* Sein Ja zu Poster viu (Owner 16.09.2026: „er muss aber ankreuzen: ich will meine bilder als
     Poster viu verkaufen") — ohne Häkchen wird nichts von ihm gedruckt und nichts verkauft. */
  const [posterViu, setPosterViu] = useState(start.posterViu === true);
  const [instagram, setInstagram] = useState(start.instagram ?? "");
  const [facebook, setFacebook] = useState(start.facebook ?? "");
  const [profilBild, setProfilBild] = useState(start.profilBild);
  /* Nach dem Kauf: `?abo=neu` steht in der Adresse (siehe `MandantKaufen`). Der Satz steht dann
     oben, einmal — danach nimmt ihn der Browser aus der Adresse. */
  const [aboNeu, setAboNeu] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("abo") !== "neu") return;
    setAboNeu(true);
    p.delete("abo");
    window.history.replaceState({}, "", `${window.location.pathname}${p.toString() ? `?${p}` : ""}`);
  }, []);
  /* ── DER TEXT ZUR AUFNAHME IST EIN VORSCHLAG (Owner 18.09.2026: „hier muss stehen, dass es ein
     Vorschlag ist. Er kann das korrigieren und speichern" · „nicht in dritter Person sprechen,
     sondern Lucrez in…" · „und anfangen: Mă numesc Terry…") ─────────────────────────────────
     Vorgeschlagen wird sein eigener Text in der Ich-Form, mit seinem Namen als Anfang. Was er
     hier ändert, bleibt stehen — es wird mit „Speichern" abgelegt. */
  const [skript, setSkript] = useState(
    start.stimmeSkript
    || [T.stimmeSkriptAnfang.replace("{name}", start.name ?? ""), (start.ueberMich ?? "").trim()].filter(Boolean).join(" "),
  );
  const [kacheln, setKacheln] = useState<Kachel[]>(start.kacheln);
  const [version, setVersion] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<"" | "speichert" | "gespeichert" | "fehler">("");
  const [hinweis, setHinweis] = useState("");
  /**
   * Ob der Hinweis ein PREMIUM-Fall ist (Owner 14.09.2026: „wenn er auf eine Funktion klickt wie
   * KI, dann steht Upgrade").
   *
   * Eigener Zustand statt eines Textvergleichs: Am Hinweis-Text allein wäre nicht zu erkennen,
   * ob ein Kaufknopf dazugehört — und er wird dann auch nicht rot gesetzt, denn es ist kein
   * Fehler, sondern eine Grenze.
   */
  const [premium, setPremium] = useState(false);
  /* Zehn ohne Abo, 25 mit — dieselben Zahlen wie auf der Preisseite und im Server. */
  const werkeMax = start.abo ? WERKE_ABO : WERKE_FREI;
  const [laedt, setLaedt] = useState(false);
  const [kachelZiel, setKachelZiel] = useState<number | null>(null);
  /**
   * ── NICHTS GEHT VOR „SPEICHERN" HINAUS (Owner 12.09.2026: „egal was er in seinem Profil macht,
   * Bild von sich hochladen, Texte, Profil, Kunstwerke ändern" · „das selbe Prinzip. Grosser
   * Button lade Bilder hoch, save. Dann wird alles angelegt") ─────────────────────────────────
   *
   * Bis hierher ging JEDES Bild im Augenblick des Auswählens zum Server, samt Inhaltsprüfung —
   * zehn Bilder waren zehn Wartezeiten, und wer danach abbrach, hatte trotzdem alles hochgeladen.
   *
   * Jetzt liegen sie als Data-URL im Browser (`ausstehend`, Schlüssel „profil" oder die Werknummer)
   * und reisen erst mit „Speichern". `entfernt` merkt sich, was weg soll — auch das passiert erst
   * dort, sonst wäre ein Klick auf „Entfernen" unwiderruflich, bevor er gespeichert hat.
   */
  const [ausstehend, setAusstehend] = useState<Record<string, string>>({});
  const [entfernt, setEntfernt] = useState<string[]>([]);
  /* „Über mich" hat einen EIGENEN Speichern-Knopf und einen eigenen Zustand (Owner 13.09.2026:
     „hier müssen wir ein extra Save machen"). Getrennt vom grossen `status`, sonst meldete die
     Fussleiste „Gespeichert", obwohl dort noch ungespeicherte Bilder warten. */
  const [ueberStatus, setUeberStatus] = useState<"" | "speichert" | "gespeichert" | "fehler">("");
  const [aiLaeuft, setAiLaeuft] = useState(false);
  /* Je Werk ein eigener Ladezustand — ein gemeinsamer würde alle Knöpfe zugleich drehen lassen. */
  const [spruchLaeuft, setSpruchLaeuft] = useState<Record<number, boolean>>({});
  /**
   * ── „KUNST FREISTELLEN" (Owner 18.09.2026: „sie haben drum herum fotografiert") ─────────────
   *
   * `freiLaeuft` je Werk, damit sich beim Klick nicht alle zwölf Knöpfe drehen — dieselbe Regel
   * wie beim Satz-Knopf darunter.
   *
   * `freiVorher` hält das Bild, das VOR dem Freistellen dastand. Damit ist der Knopf umkehrbar:
   * Ein Druck stellt frei, der nächste holt das Original zurück. Ohne diesen Merker wäre die
   * einzige Rückfahrkarte „Seite neu laden und hoffen, dass nichts gespeichert wurde" — und bei
   * einem Werk, das bewusst im Raum fotografiert wurde, ist das Freistellen ein Schaden.
   */
  const [freiLaeuft, setFreiLaeuft] = useState<Record<number, boolean>>({});
  const [freiVorher, setFreiVorher] = useState<Record<number, string>>({});
  /**
   * ── DER STAND JEDES WERKS (Owner 18.09.2026) ────────────────────────────────────────────────
   *
   * „Er kann das hochladen, und dann steht auf Status ‚noch nicht freigegeben'. Ich gebe das
   * frei, dann bekommt er den Status ‚freigegeben'."
   *
   * Kommt aus der ABLAGE (`api/portal-status`), nicht aus dem Formular: Wo die Datei liegt, ist
   * die Wahrheit. Nach jedem Speichern neu geholt — dann sieht er sofort, dass sein frisches
   * Bild wartet.
   */
  const [staende, setStaende] = useState<Record<string, { stand: "frei" | "pruefung" | "abgelehnt"; gruende?: string[]; notiz?: string }>>({});
  /**
   * ── DER ZÄHLER ZÄHLT, WAS MAN SIEHT (Owner 18.09.2026: „hier steht 5/10, aber es sind nur 3") ─
   *
   * `kacheln` kommt aus `werkNummern` — der Liste der PLÄTZE. Bei `artist-2` stehen dort fünf,
   * aber für zwei davon liegt nirgends eine Datei: weder in der Galerie noch in der Prüfung.
   * Solche Geisterplätze entstehen, wenn ein Upload scheitert oder ein Bild gelöscht wird, ohne
   * dass die Nummer mitgeht.
   *
   * Gezählt wird deshalb, was WIRKLICH ein Bild hat: auf dem Server (`staende`) oder als frisch
   * gewähltes im Browser (`ausstehend`). Die Geisterplätze bleiben sichtbar und sagen es selbst —
   * verstecken wäre schlimmer, dann wüsste er nicht, warum er keine zehn hochladen kann.
   */
  const hatBild = (i: number) => !!staende[nrVon(i)] || !!ausstehend[nrVon(i)];
  /**
   * ── „GESPEICHERT" MUSS MAN SEHEN (Owner 18.09.2026: „wurde gespeichert müsste kommen, wenn
   * Bild hochgeladen wird oder ich auch save klicke" · „soll automatisch verschwinden") ────────
   *
   * Es gab eine Meldung — aber sie stand in der unteren Leiste hinter `sm:block`, also auf dem
   * Handy gar nicht, und sie blieb stehen, bis der nächste Schritt sie überschrieb. Wer auf
   * einem Telefon speicherte, bekam nie eine Rückmeldung; wer am Rechner speicherte, sah sie
   * noch Minuten später und wusste nicht, ob sie von eben stammt.
   *
   * Jetzt eine Sprechblase über der Leiste, auf jeder Grösse, die nach zweieinhalb Sekunden von
   * selbst geht. Der Merker liegt an der Zeit, nicht am nächsten Klick — sonst hinge sie wieder.
   */
  const [bestaetigung, setBestaetigung] = useState("");
  const bestaetigen = useCallback((text: string) => {
    setBestaetigung(text);
    setTimeout(() => setBestaetigung(v => (v === text ? "" : v)), 2500);
  }, []);
  const staendeHolen = useCallback(async () => {
    try {
      const r = await fetch(`/api/portal-status?m=${encodeURIComponent(mandant)}&k=${encodeURIComponent(k)}`);
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; staende?: { nr: string; stand: "frei" | "pruefung" | "abgelehnt"; gruende?: string[]; notiz?: string }[] };
      if (!d.ok) return;
      setStaende(Object.fromEntries((d.staende ?? []).map(x => [x.nr, { stand: x.stand, gruende: x.gruende, notiz: x.notiz }])));
    } catch { /* ohne Stand sieht die Kachel aus wie bisher */ }
  }, [mandant, k]);
  useEffect(() => { void staendeHolen(); }, [staendeHolen]);
  /**
   * ── DER WEG ZURÜCK (Owner 13.09.2026: „Icon für zurück zur letzten Version" · „auch bei den
   * Werken") ──────────────────────────────────────────────────────────────────────────────────
   *
   * Die KI schreibt ihren Vorschlag DIREKT ins Feld. Wer neugierig einmal drückt und das Ergebnis
   * nicht mag, hat seinen eigenen Text verloren — und müsste ihn neu tippen. Genau deshalb fasst
   * man solche Knöpfe nicht an.
   *
   * NUR IM BROWSER und getrennt je Feld: eine Fassung für „Über mich", eine JE WERKNUMMER. Ein
   * gemeinsamer Speicher würde bei Bild 3 den Satz von Bild 7 zurückholen. `null` bzw. ein
   * fehlender Eintrag heisst: Es gibt nichts zurückzuholen, der Knopf erscheint gar nicht.
   */
  /**
   * Das Fenster am vollen Hochladen-Knopf (Owner 13.09.2026: „hier muss doch klicken können,
   * aber Dialog öffnet sich. Dann wird dort stehen Premium kaufen — aber nicht jetzt").
   *
   * HIER KOMMT SPÄTER DER KAUFWEG HIN. Solange es Premium nicht gibt, steht dort nur, was er
   * jetzt tun kann; ein Hinweis auf ein Angebot, das nirgendwohin führt, verbrennt genau den
   * Augenblick, in dem er zahlungsbereit wäre.
   */
  const [vollDialog, setVollDialog] = useState(false);
  const [ueberMichVorher, setUeberMichVorher] = useState<string | null>(null);
  const [spruchVorher, setSpruchVorher] = useState<Record<number, string>>({});
  /* Nur gesetzt, wenn der Knopf WIRKLICH einen Titel geliefert und das Feld überschrieben hat —
     sonst würde „Rückgängig" ihren eigenen, gerade erst getippten Titel gegen einen leeren
     tauschen, den es nie gab. */
  const [titelVorher, setTitelVorher] = useState<Record<number, string>>({});
  /**
   * ── DIE ABSAGE STEHT AM KNOPF, NICHT AM SEITENANFANG (Owner 19.09.2026: „als ich noch kein Abo
   * hatte, habe ich versucht die Texte vom Poster mit AI zu korrigieren, und habe keine Meldung
   * bekommen: kauf Premium") ─────────────────────────────────────────────────────────────────
   *
   * Der Hinweis gab es längst — er stand nur an EINER Stelle, oben über dem Werk-Raster. Wer beim
   * siebten Werk auf „Scrie cu AI" drückt, sieht davon nichts: Die Meldung erscheint mehrere
   * Bildschirmhöhen weiter oben, während unter seinem Finger der Knopf einfach aufhört zu drehen.
   * Ein stummer Knopf liest sich als Defekt, nicht als Grenze.
   *
   * Hausregel (Skill `ci-design`): Absagen gehören ANS FELD. Also je Werk gemerkt und je Werk
   * angezeigt — beim Premium-Fall mit dem Kaufknopf direkt daneben.
   */
  const [spruchAbsage, setSpruchAbsage] = useState<Record<number, "premium" | "fehler" | "bild">>({});
  const dateiProfil = useRef<HTMLInputElement>(null);
  const dateiKachel = useRef<HTMLInputElement>(null);
  /* Sein eigenes Gerät zählt nicht als Besucher und schickt ihm keine Besuchs-Mail (Owner 11.09.2026). */
  useEffect(() => {
    try { localStorage.setItem(`lb_eigen_${mandant}`, "1"); } catch { /* egal */ }
  }, [mandant]);

  /**
   * SOLANGE ES RECHNET, SIEHT ER ZU (Owner 12.09.2026: „er sieht die Meldung … und dann tatataa").
   *
   * Die Sätze entstehen serverseitig, nachdem diese Seite ausgeliefert wurde. Sie lädt sich
   * deshalb alle paar Sekunden selbst nach — und hört damit von allein auf, sobald `aufbau`
   * falsch ist, weil die Seite dann ohne die Meldung zurückkommt.
   */
  useEffect(() => {
    if (!aufbau) return;
    const t = setTimeout(() => window.location.reload(), 6000);
    return () => clearTimeout(t);
  }, [aufbau]);

  /**
   * „MEINE SEITE LÖSCHEN" — DREI STUFEN (Owner 12.09.2026: „delete page ganz links, aber erst
   * wird rot, dann noch mal").
   *
   * 1. grau, unauffällig · 2. rot und gefüllt — jetzt ist klar, worauf er gleich drückt · 3. die
   * Mail ist unterwegs. Gelöscht wird auch dann nichts: Das entscheidet er erst auf der Seite
   * hinter dem Link in der Mail, mit Ja oder Nein. Zwei Rückfragen für den einen Klick, den man
   * nicht zurücknehmen kann.
   */
  const [loeschDialog, setLoeschDialog] = useState(false);
  const [loeschMail, setLoeschMail] = useState(false);
  const loeschenAnfordern = async () => {
    setLoeschDialog(false);
    setLoeschMail(true);
    await fetch("/api/versusforge-senden", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ was: "loeschen", mandant, k }),
    }).catch(() => {});
  };

  const nrVon = (i: number) => (i < 0 ? "-1" : String(i));
  /**
   * WELCHES WERK IHN VERTRITT — dieselbe Wahl wie auf der öffentlichen Seite
   * (`app/portal/[kuenstler]/page.tsx`): das angehakte Werk, sonst das erste.
   *
   * AUS DEM FORMULARZUSTAND, nicht aus dem Datensatz: Setzt er das Häkchen um, folgt der
   * Profilkreis sofort — ohne Speichern und ohne Neuladen. `null`, wenn er noch kein Werk hat;
   * dann bleibt der Kreis leer, statt ein Bild zu erfinden.
   */
  const vertreterNr = kacheln.length
    ? (kacheln.find(x => x.vertritt) ?? kacheln[0]).i
    : null;
  const bildUrl = (nr: string) =>
    `/api/portal-werk?m=${encodeURIComponent(mandant)}&i=${encodeURIComponent(nr)}&k=${encodeURIComponent(k)}&v=${version[nr] ?? 0}`;
  /**
   * Das Werk freistellen: Ecken suchen lassen, entzerren, als vorgemerktes Bild einsetzen.
   *
   * GESPEICHERT WIRD NICHTS — das Ergebnis liegt wie ein frisch gewähltes Foto in `ausstehend`
   * und geht erst mit „Speichern" auf den Server. Bis dahin sieht der Künstler Vorher und
   * Nachher, indem er den Knopf drückt und wieder drückt.
   */
  async function freistellen(i: number) {
    const nr = nrVon(i);
    if (freiLaeuft[i]) return;
    /* Zweiter Druck: zurück zum Original. */
    if (freiVorher[i] !== undefined) {
      const zurueck = freiVorher[i];
      setFreiVorher(v => { const n = { ...v }; delete n[i]; return n; });
      setAusstehend(v => {
        const n = { ...v };
        if (zurueck) n[nr] = zurueck; else delete n[nr];
        return n;
      });
      return;
    }
    setFreiLaeuft(v => ({ ...v, [i]: true }));
    try {
      /* Das Bild als Daten-URI — entweder das vorgemerkte aus dem Browser oder das vom Server. */
      let quelle = ausstehend[nr] ?? "";
      if (!quelle) {
        const r = await fetch(bildUrl(nr));
        const blob = await r.blob();
        quelle = await new Promise<string>((ok, weg) => {
          const leser = new FileReader();
          leser.onload = () => ok(String(leser.result ?? ""));
          leser.onerror = weg;
          leser.readAsDataURL(blob);
        });
      }
      const res = await fetch("/api/werk-freistellen", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandant, schluessel: k, bild: quelle }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; bild?: string };
      if (d.ok && d.bild) {
        setFreiVorher(v => ({ ...v, [i]: ausstehend[nr] ?? "" }));
        setAusstehend(v => ({ ...v, [nr]: d.bild as string }));
      } else {
        setHinweis(T.freistellenNichts);
      }
    } catch {
      setHinweis(T.freistellenNichts);
    } finally {
      setFreiLaeuft(v => ({ ...v, [i]: false }));
    }
  }

  /* Bilder, die (noch) nicht da sind — in der Prüfung oder nie hochgeladen. Sie zeigen den Platzhalter. */
  const [fehlt, setFehlt] = useState<Record<string, boolean>>({});
  const neuLaden = (nr: string) => {
    setVersion(v => ({ ...v, [nr]: (v[nr] ?? 0) + 1 }));
    setFehlt(v => ({ ...v, [nr]: false }));
  };

  /** "ok" = sofort angenommen · "pruefung" = liegt beim Owner, noch nicht sichtbar · false = nicht gespeichert. */
  const hochladen = async (daten: string, nr: string): Promise<"ok" | "pruefung" | false> => {
    if (!daten) return false;
    setLaedt(true);
    try {
      const res = await fetch("/api/versusforge-bild", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ was: "motiv", mandant, k, daten, nr }),
      });
      const d = (await res.json().catch(() => ({}))) as { code?: string; pruefung?: boolean };
      if (res.status === 422 || d.code === "abgelehnt" || d.code === "aktfoto") { setHinweis(T.bildAbgelehnt); return false; }
      if (res.ok && d.pruefung) { setHinweis(T.bildPruefung); return "pruefung"; }
      if (!res.ok) { setHinweis(T.speichernFehler); return false; }
      return "ok";
    } catch {
      setHinweis(T.speichernFehler);
      return false;
    } finally {
      setLaedt(false);
    }
  };

  /**
   * WELCHES WERK IHN VERTRITT (Owner 12.09.2026: „welches bild mich repräsentiert").
   *
   * AUSSCHLIESSEND, deshalb kein gewöhnliches Häkchen: Anhaken setzt dieses und löscht ALLE
   * anderen in einem Zug. Zwei Werke, die ihn beide „vertreten", wären keine Wahl mehr — und die
   * Seite müsste dann selbst raten, welches sie beim Teilen zeigt.
   */
  const vertrittSetzen = (i: number, an: boolean) => {
    setKacheln(v => v.map(x => ({ ...x, vertritt: an && x.i === i })));
    setStatus("");
  };
  /* Ein Werk als Poster viu anbieten oder nicht — anders als `vertritt` dürfen hier beliebig
     viele gesetzt sein (Owner 16.09.2026: „auch bei jedem bild"). */
  const posterSetzen = (i: number, an: boolean) => {
    setKacheln(v => v.map(x => (x.i === i ? { ...x, poster: an } : x)));
    setStatus("");
  };
  const aendern = (i: number, feld: Exclude<keyof Kachel, "i" | "vertritt" | "poster" | "kunst" | "nurStimme">, wert: string) => {
    setKacheln(v => v.map(x => (x.i === i ? { ...x, [feld]: wert } : x)));
    setStatus("");
  };

  /* „Nur die Stimme zeigen" je Werk (Owner 17.09.2026) — ein Häkchen, also ein eigener Weg;
     `aendern` nimmt Text. */
  const nurStimmeSetzen = (i: number, an: boolean) => {
    setKacheln(v => v.map(x => (x.i === i ? { ...x, nurStimme: an } : x)));
    setStatus("");
  };

  /* Auch das Entfernen wartet auf „Speichern" — vorher ist nichts unwiderruflich. */
  const entfernen = (i: number) => {
    const nr = nrVon(i);
    setKacheln(v => v.filter(x => x.i !== i));
    setAusstehend(v => { const n = { ...v }; delete n[nr]; return n; });
    setEntfernt(v => (v.includes(nr) ? v : [...v, nr]));
    setStatus("");
  };

  /**
   * ── HIER PASSIERT ALLES (Owner 12.09.2026: „Grosser Button lade Bilder hoch, save. Dann wird
   * alles angelegt") ──────────────────────────────────────────────────────────────────────────
   *
   * Der Reihe nach: Entferntes löschen · vorgemerkte Bilder hochladen (dort läuft die
   * Inhaltsprüfung) · dann die Texte. Die Texte ZULETZT, weil der Server daraus die Sprüche für
   * Werke ohne Satz schreibt — er soll dabei die Bilder schon kennen.
   *
   * EINZELN STATT IN EINEM PAKET: Zehn Bilder wären als Data-URL mehrere Megabyte in einem
   * Request; die Bild-Route nimmt sie ohnehin einzeln entgegen und ist dort geprüft.
   */
  const speichern = async () => {
    setStatus("speichert");
    setHinweis("");
    try {
      for (const nr of entfernt) {
        await fetch("/api/versusforge-bild", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ was: "motiv", mandant, k, daten: "", nr: nr === "-1" ? "" : nr }),
        }).catch(() => {});
      }
      let abgelehnt = false;
      for (const [nr, daten] of Object.entries(ausstehend)) {
        const ergebnis = await hochladen(daten, nr === "profil" ? "profil" : nr === "-1" ? "" : nr);
        if (!ergebnis) abgelehnt = true;
        else neuLaden(nr);
      }
      const res = await fetch("/api/portal-profil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandant, k, name, ort, ueberMich, preisSpanne, profilBild, posterViu, instagram, facebook, kacheln, stimmeSkript: skript }),
      });
      setEntfernt([]);
      setAusstehend({});
      setStatus(res.ok && !abgelehnt ? "gespeichert" : "fehler");
      /* Auch beim grossen Speichern die Sprechblase — sie ist die einzige Rückmeldung, die auf
         dem Handy überhaupt zu sehen ist. */
      if (res.ok && !abgelehnt) { bestaetigen(T.gespeichert); void staendeHolen(); }
    } catch {
      setStatus("fehler");
    }
  };

  /**
   * „ÜBER MICH" UND SEIN FOTO — der enge Weg (Owner 13.09.2026: „Salvează von dem Text im Profil
   * soll auch Profilbild speichern").
   *
   * Er steht oben im Formular: Foto links, Text rechts. Wer beides ändert und auf DIESEN Knopf
   * drückt, hat beides gespeichert — alles andere wäre eine Falle, weil das Foto sichtbar
   * ausgetauscht ist und trotzdem im Browser läge.
   *
   * ENG BLEIBT ER TROTZDEM: Werke, Preisspanne, Name und Ort rührt er nicht an. Die gehören zum
   * grossen Speichern-Knopf unten, und was dort offen ist, soll hier nicht heimlich mitgehen.
   *
   * DAS BILD ZUERST, DANN DAS FELD: `profilBild: true` darf erst in den Datensatz, wenn die Datei
   * wirklich liegt. Umgekehrt zeigte die Seite eine Bildstelle, hinter der nichts ist.
   */
  const ueberMichSpeichern = async () => {
    setUeberStatus("speichert");
    try {
      let fotoOk = true;
      if (ausstehend.profil) {
        const ergebnis = await hochladen(ausstehend.profil, "profil");
        fotoOk = ergebnis !== false;
        /* Nur wenn es durch ist, aus der Warteschlange nehmen — sonst verlöre er sein Bild
           still, und der grosse Knopf könnte es auch nicht mehr nachholen. */
        if (fotoOk) {
          setAusstehend(v => { const n = { ...v }; delete n.profil; return n; });
          neuLaden("profil");
        }
      }
      const res = await fetch("/api/portal-ueber-mich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandant, k, ueberMich, profilBild }),
      });
      setUeberStatus(res.ok && fotoOk ? "gespeichert" : "fehler");
    } catch {
      setUeberStatus("fehler");
    }
  };

  /**
   * KI-KORREKTUR — sie schlägt vor, sie speichert nicht (Owner 13.09.2026: „Schreib einfach frei
   * etwas, wir formulieren das mit AI richtig").
   *
   * Der geglättete Text landet im Feld; er liest ihn und drückt selbst auf Speichern. Deshalb
   * wird `ueberStatus` hier geleert: Was im Feld steht, ist ab jetzt wieder ungespeichert.
   */
  const ueberMichKorrigieren = async () => {
    if (!ueberMich.trim() || aiLaeuft) return;
    setAiLaeuft(true);
    try {
      const res = await fetch("/api/portal-text-korrektur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandant, k, text: ueberMich }),
      });
      const d = (await res.json().catch(() => null)) as { text?: string; grund?: string } | null;
      /* Seinen Text merken, BEVOR der Vorschlag ihn überschreibt. */
      if (res.ok && d?.text) { setUeberMichVorher(ueberMich); setUeberMich(d.text); setUeberStatus(""); }
      /* Ohne Abo: derselbe Hinweis wie beim Spruch-Knopf, nicht das nackte „fehler". */
      else if (d?.grund === "premium") { setUeberStatus(""); setPremium(true); setHinweis(T.aboKiGesperrt); }
      else setUeberStatus("fehler");
    } catch {
      setUeberStatus("fehler");
    } finally {
      setAiLaeuft(false);
    }
  };

  /**
   * Einen Satz für EIN Werk schreiben lassen. Der Vorschlag landet im Feld; gespeichert wird er
   * erst mit „Speichern" — so bleibt die Entscheidung bei ihr.
   *
   * ── DER TITEL LÄUFT MIT (Owner 25.09.2026: „du musst mir Titel auch generieren wenn ich
   * drücke") ─────────────────────────────────────────────────────────────────────────────────
   * Derselbe Knopf, derselbe Aufruf — kein zweiter Knopf nur für den Titel. Nur wenn das Modell
   * WIRKLICH einen Titel liefert, wird ihr Feld überschrieben (und merkt sich den alten Wert
   * für „Rückgängig"); liefert es keinen, bleibt ihr eigener Titel unberührt.
   */
  const spruchSchreiben = async (i: number) => {
    if (spruchLaeuft[i]) return;
    setSpruchLaeuft(v => ({ ...v, [i]: true }));
    setHinweis("");
    setSpruchAbsage(v => { const n = { ...v }; delete n[i]; return n; });
    try {
      const res = await fetch("/api/portal-spruch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandant, k, i }),
      });
      const d = (await res.json().catch(() => null)) as { spruch?: string; titel?: string; grund?: string } | null;
      /* Seinen Satz merken, BEVOR der Vorschlag ihn überschreibt — je Werk getrennt. */
      if (res.ok && d?.spruch) {
        const alt = kacheln.find(x => x.i === i)?.spruch ?? "";
        setSpruchVorher(v => ({ ...v, [i]: alt }));
        aendern(i, "spruch", d.spruch);
        if (d.titel) {
          const altTitel = kacheln.find(x => x.i === i)?.titel ?? "";
          setTitelVorher(v => ({ ...v, [i]: altTitel }));
          aendern(i, "titel", d.titel);
        }
        setStatus("");
      }
      /* Kein stummer Knopf: Liegt das Bild noch in der Prüfung, erfährt sie den Grund.
         OHNE ABO IST ES KEIN FEHLER, sondern eine Grenze — „Speichern fehlgeschlagen" würde ihr
         einen Defekt vorspiegeln, wo sie nur etwas kaufen muss (Owner 14.09.2026). */
      else setSpruchAbsage(v => ({ ...v, [i]: d?.grund === "premium" ? "premium" : d?.grund === "kein-bild" ? "bild" : "fehler" }));
    } catch {
      setSpruchAbsage(v => ({ ...v, [i]: "fehler" }));
    } finally {
      setSpruchLaeuft(v => ({ ...v, [i]: false }));
    }
  };

  /* Ein Feld sieht aus wie der fertige Text — erst beim Darüberfahren und Tippen zeigt ein Rahmen, dass es geht. */
  const feld = "block w-full rounded-md border border-dashed border-[#d9d9d9] bg-transparent px-1 outline-none transition hover:border-[#999] focus:border-solid focus:border-[#1d6fd0]";

  return (
    <main className="mx-auto w-full max-w-[1120px] px-5 pb-32 pt-8 md:pt-12">
      {/**
        * ── ZURÜCK INS DASHBOARD (Owner 13.09.2026: „ich brauche ein Button zum Dashboard") ────
        *
        * Von hier führte bisher nichts dorthin. Er kommt über den Link aus seiner Mail in diese
        * Ansicht und fand von hier aus nur seine öffentliche Seite — Anfragen, Besucher und die
        * Freigabe lagen hinter einer Adresse, die er sich merken musste.
        *
        * OBEN UND NICHT IN DER FUSSLEISTE: Die trägt schon Löschen, Vorschau und Speichern; ein
        * vierter Knopf sprengt sie am Handy. Hier steht er beim Öffnen sofort da und verdrängt
        * nichts. Zurückhaltend gestaltet — er ist ein Weg, kein Angebot.
        *
        * RELATIVE ADRESSE: Wir sind bereits auf dem Portal, und sie trägt seinen Schlüssel weiter,
        * ohne den das Dashboard ihn nicht einlässt.
        */}
      {aboNeu && (
        <p className="m-0 mb-5 rounded-xl bg-[#111] px-5 py-4 text-[15px] font-semibold leading-[1.5] text-white">
          {T.aboAktivJetzt}
        </p>
      )}
      <a href={`/${encodeURIComponent(mandant)}/dashboard?k=${encodeURIComponent(k)}`}
        className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-[#dfe4e9] px-4 py-2 text-[13.5px] font-semibold text-[#555] no-underline transition hover:border-[#111] hover:text-[#111]">
        <LayoutDashboard className="h-[15px] w-[15px]" aria-hidden />
        {T.zumDashboard}
      </a>
      {/* ── „DEINE INHALTE WERDEN ANGELEGT" — und dann tataa (Owner 12.09.2026) ──────────────
          Sie steht über allem anderen, weil sie erklärt, warum unter den Bildern noch nichts
          steht. Verschwindet von selbst: Sobald die Sätze geschrieben sind, ist `aufbau` falsch. */}
      {aufbau && (
        <p className="m-0 mb-4 rounded-xl bg-[#fff6e0] px-4 py-3 text-[15px] font-semibold leading-[1.45] text-[#5b4a00]">
          {T.aufbau}
        </p>
      )}
      {/* HIER STAND EIN ERKLÄRKASTEN (Owner 12.09.2026: „das raus"): „Du bearbeitest deine Seite.
          Tippe auf einen Text oder ein Bild … So sehen Käufer deine Seite". Drei Sätze über etwas,
          das man am Antippen sofort merkt — und der Vorschau-Link darin steht jetzt als Knopf
          unten, zusammen mit Hochladen und Löschen. */}

      <input ref={dateiProfil} type="file" accept="image/*" hidden
        onChange={async e => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          /* Nur vormerken — hochgeladen wird beim Speichern. Angezeigt wird sofort, aus dem Browser. */
          const daten = await verkleinern(f);
          setAusstehend(v => ({ ...v, profil: daten }));
          setEntfernt(v => v.filter(x => x !== "profil"));
          setProfilBild(true);
          setStatus("");
        }} />
      {/* ── EIN KNOPF, VIELE BILDER (Owner 12.09.2026: „hier steht adaugă o lucrare, nein. Ich habe
          dir gesagt das selbe Prinzip. Grosser Button lade Bilder hoch, save. Dann wird alles
          angelegt") ────────────────────────────────────────────────────────────────────────────
          Hier ging genau EIN Werk je Klick — wer zehn Bilder aus dem Keller hat, klickte zehnmal
          durch den Dateidialog. Jetzt wählt er alle auf einmal aus, so wie im Trichter.

          NACHEINANDER HOCHGELADEN, nicht gleichzeitig: Jede Datei bekommt die nächste freie
          Nummer, und die ergibt sich aus der vorigen. Parallel würden zwei Bilder dieselbe Nummer
          beanspruchen und eines das andere überschreiben.

          BEIM GEZIELTEN ERSETZEN (`kachelZiel` gesetzt) zählt weiterhin nur die erste Datei —
          dort ist die Kachel ja schon gewählt. */}
      <input ref={dateiKachel} type="file" accept="image/*" multiple hidden
        onChange={async e => {
          const dateien = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (!dateien.length) return;
          if (kachelZiel === null) {
            /**
             * ── DIE KLEINSTE FREIE NUMMER, NICHT „HÖCHSTE PLUS EINS" (Owner 13.09.2026:
             * „Szidonia hat nur 8 Bilder und kann keine weiter hochladen") ──────────────────────
             *
             * GEMESSEN an ihrem Datensatz: Nummern [-1, 0, 3, 4, 5, 9, 10, 11] — acht Werke, aber
             * die höchste ist 11. `Math.max(…) + 1` ergab 12, und das alte `if (naechste > 11)
             * break` brach sofort ab, ohne eine einzige Datei vorzumerken.
             *
             * DAS WAR DER SCHLIMMSTE FEHLERTYP: Der Knopf blieb sichtbar (8 < 13), reagierte auf
             * den Tipp, öffnete die Dateiauswahl — und danach passierte nichts. Keine Meldung,
             * kein Hinweis. Sie hielt die Seite für kaputt und hatte recht.
             *
             * Die Nummern stiegen, weil sie Werke GELÖSCHT und neue hochgeladen hat; die Anzahl
             * blieb klein, der Zähler nicht. In der Ablage liegt unter 1, 2, 6, 7, 8 nichts mehr
             * (geprüft) — es sind echte freie Plätze. Deshalb werden sie wiederverwendet.
             *
             * Die Nummer bleibt weiterhin die Identität der Kachel: Wir füllen nur Lücken, wir
             * rücken nichts nach. Unter Nummer 3 steht danach derselbe Spruch wie vorher.
             */
            /**
             * ── HÖCHSTENS ZEHN WERKE (Owner 13.09.2026: „wenn der User versucht, mehr als 10
             * hochzuladen, lässt du ihn nicht … wenn er schon 8 hat, nicht mehr als 2") ────────
             *
             * Das Auswahlfenster gehört dem Betriebssystem — dort lässt sich nicht vorgeben, wie
             * viele Dateien er markieren darf. Also hier: Es werden nur so viele übernommen, wie
             * Plätze frei sind, und der Rest wird GESAGT. Stillschweigend zu schlucken ist genau
             * der Fehler, an dem Szidonia heute gescheitert ist.
             */
            const offenePlaetze = Math.max(0, werkeMax - kacheln.length);
            const nehmen = Math.min(dateien.length, offenePlaetze);
            const belegt = new Set(kacheln.map(x => x.i));
            const frei: number[] = [];
            /* Die Nummern reichen weiter als die Plätze (Bestandskünstler haben bis zu 12 Werke) —
               begrenzt wird über `nehmen`, nicht über den Nummernvorrat. */
            for (let i = 0; i <= 11 && frei.length < nehmen; i += 1) {
              if (!belegt.has(i)) frei.push(i);
            }
            if (dateien.length > nehmen) {
              setHinweis(nehmen === 0
                ? T.werkeVoll.replace("{max}", String(werkeMax))
                : T.zuVieleBilder.replace(/\{n\}/g, String(nehmen)));
            }
            const neue: (typeof kacheln)[number][] = [];
            const vorgemerkt: Record<string, string> = {};
            for (const f of dateien) {
              const nr = frei.shift();
              if (nr === undefined) break;
              vorgemerkt[String(nr)] = await verkleinern(f);
              neue.push({ i: nr, spruch: "", titel: "", technik: "", groesse: "", jahr: "", geschichte: "", preis: "", detalii: "", vertritt: false, poster: false, kunst: true });
            }
            if (neue.length) {
              setAusstehend(v => ({ ...v, ...vorgemerkt }));
              setKacheln(v => [...v, ...neue]);
            }
          } else {
            const nr = kachelZiel < 0 ? "-1" : String(kachelZiel);
            const daten = await verkleinern(dateien[0]);
            setAusstehend(v => ({ ...v, [nr]: daten }));
            /**
             * ── EIN GETAUSCHTES BILD GEHT SOFORT HOCH (Owner 18.09.2026: „ich glaube, die Bilder
             * beim Hochladen müssen automatisch gespeichert werden") ────────────────────────────
             *
             * Bisher wurde es nur VORGEMERKT und erst bei „Speichern" hochgeladen. Das war der
             * Grund, warum nach dem Speichern scheinbar „das alte Bild wieder da" war: Wer die
             * Seite vorher neu lud oder das Speichern übersah, hatte das neue Bild nie irgendwo
             * ausser in seinem Browser.
             *
             * Beim gezielten TAUSCHEN ist die Kachel eindeutig, also gibt es nichts mehr zu
             * sammeln — es geht sofort in die Prüfung, und der Stand daneben sagt es ihm.
             *
             * Beim Hochladen MEHRERER neuer Werke (oben) bleibt es beim Sammeln: Dort entstehen
             * die Kachelnummern erst, und ein halb hochgeladener Stapel wäre schwerer zu
             * verstehen als einer, der auf einen Knopf wartet.
             */
            void (async () => {
              const r = await hochladen(daten, nr);
              if (r) { neuLaden(nr); void staendeHolen(); bestaetigen(T.gespeichert); }
            })();
            setEntfernt(v => v.filter(x => x !== nr));
          }
          setStatus("");
        }} />

      {/* ── FOTO · NAME · ORT ── */}
      <div className="mt-8 flex items-center gap-5">
        {/**
          * ── ER SIEHT, WAS BESUCHER SEHEN — UND DASS ER TIPPEN KANN (Owner 13.09.2026: „wieso
          * sehe ich bei Cosmin kein Bild?" · „muss Icon stehen auch für Fotoupload drauf") ─────
          *
          * Ohne eigenes Foto zeigt die ÖFFENTLICHE Seite sein vertretendes Werk (siehe
          * `app/portal/[kuenstler]/page.tsx`). Hier stand dagegen ein leerer Kreis: Besucher
          * sahen ein Bild, er selbst nichts — genau verkehrt herum.
          *
          * Jetzt steht dasselbe Werk auch hier, abgeblendet, mit Kamera-Marke darüber. Abgeblendet
          * und beschriftet, weil es NICHT sein Profilbild ist: Sähe es aus wie eines, lüde er nie
          * eins hoch. Die Marke sagt, dass der Kreis antippbar ist — bei den Werk-Kacheln gibt es
          * sie längst („Schimbă imaginea"), hier fehlte sie.
          *
          * NUR ANZEIGE: `profilBild` bleibt unberührt, es wird nichts geschrieben.
          */}
        <button type="button" onClick={() => dateiProfil.current?.click()} aria-label={T.fotoPlatzhalter}
          className="group relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-dashed border-[#ccc] bg-[#f5f5f5] text-center text-[12px] font-semibold leading-[1.2] text-[#777] transition hover:border-[#1d6fd0]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* Ein gerade gewähltes Foto liegt nur im Browser — es wird von dort gezeigt, nicht vom Server. */}
          {profilBild ? (
            <img src={ausstehend.profil ?? bildUrl("profil")} alt="" className="h-full w-full object-cover" />
          ) : (
            <>
              {vertreterNr !== null && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={bildUrl(nrVon(vertreterNr))} alt="" aria-hidden
                  className="absolute inset-0 h-full w-full object-cover opacity-35" />
              )}
              <span className="relative flex flex-col items-center gap-1 px-2">
                <Camera className="h-5 w-5" aria-hidden />
                {T.fotoPlatzhalter}
              </span>
            </>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <input value={name} onChange={e => { setName(e.target.value); setStatus(""); }} maxLength={80}
            placeholder={T.namePlatzhalter} className={`${feld} font-serif text-[32px] font-normal leading-[1.15] md:text-[48px]`} />
          {/* ── DIESES FELD SPEICHERT, DIE ZEILE AUF DEM BLATT NICHT (Owner 19.09.2026: „ich kann
              den Text im Poster nicht ändern" · „ich habe überall versucht") ───────────────────
              Beide sehen gleich aus — grosse Serifenschrift, dieselbe Stelle. Das hier ist seins
              und bleibt; die Zeile auf dem Blatt gehört dem KÄUFER und lebt nur in dessen Browser.
              Ohne diesen Satz tippt er dort und wundert sich; genau so ist am 19.09. „Your name"
              als Künstlername in den Datensatz geraten. */}
          <p className="m-0 mt-1 text-[13.5px] leading-[1.4] text-[#777]">{T.blattName}</p>
          <input value={ort} onChange={e => { setOrt(e.target.value); setStatus(""); }} maxLength={80}
            placeholder={T.ortPlatzhalter} className={`${feld} mt-1.5 text-[15px] text-[#555]`} />
          {/* WAS SEINE WERKE KOSTEN — EIN Satz, der an JEDEM Bild erscheint (Owner 12.09.2026:
              „es wird nur generell erscheinen was der künstler für seine werke verlangt bei jedem bild").
              Er schreibt nur die Spanne; „Preis auf Anfrage" hängt die Seite in der Sprache des
              Betrachters an. Einen Preis je Werk gibt es nicht mehr. */}
          <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[13.5px] font-semibold text-[#555]">{T.preisSpanneWort}</span>
            <input value={preisSpanne} onChange={e => { setPreisSpanne(e.target.value); setStatus(""); }} maxLength={60}
              placeholder={T.preisSpannePlatzhalter} className={`${feld} w-[210px] py-0.5 text-[14px] text-[#444]`} />
            <span className="text-[13.5px] text-[#888]">{T.preisAufAnfrage}</span>
          </span>
          {/* ── INSTAGRAM UND FACEBOOK (Owner 13.09.2026: „Feld für Instagram oder Facebook …
              kann er eintragen") ────────────────────────────────────────────────────────────
              Freiwillig, unter dem Preis: Wer ihn dort schon gefunden hat, folgt ihm lieber, wo
              er ohnehin ist. Eingetippt werden darf „@name" — die volle Adresse baut der Server. */}
          <span className="mt-2 flex max-w-[420px] flex-col gap-1">
            <input value={instagram} onChange={e => { setInstagram(e.target.value); setStatus(""); }} maxLength={200}
              placeholder={T.instagramPlatzhalter} className={`${feld} py-0.5 text-[14px] text-[#444]`} />
            <input value={facebook} onChange={e => { setFacebook(e.target.value); setStatus(""); }} maxLength={200}
              placeholder={T.facebookPlatzhalter} className={`${feld} py-0.5 text-[14px] text-[#444]`} />
          </span>
          {/* ── SEIN JA ZU POSTER VIU (Owner 16.09.2026: „er muss aber ankreuzen: ich will meine
              bilder als Poster viu verkaufen") ─────────────────────────────────────────────────
              Das Häkchen ist die Zustimmung, nicht ein Schalter für ein Aussehen: Erst damit
              stehen seine Werke in der Kategorie und lassen sich als Druck kaufen. Seine
              Originale bleiben unberührt — das steht in der Zeile darunter, weil genau das die
              Frage ist, die er sich beim Lesen stellt. */}
          <label className={`mt-4 flex max-w-[520px] items-start gap-2.5 text-[14px] leading-[1.5] text-[#333] ${start.abo ? "cursor-pointer" : "opacity-60"}`}>
            <input type="checkbox" checked={posterViu} className="mt-0.5" disabled={!start.abo}
              onChange={e => { setPosterViu(e.target.checked); setStatus(""); }} />
            <span>
              <span className="font-semibold">{T.posterViuJa}</span>
              {/* Der Betrag kommt aus der Drucktabelle (Skill `bezahlung`, Regel 2) — im Text
                  steht nur der Platzhalter, sonst altert die Zahl in drei Sprachen. */}
              <span className="mt-0.5 block text-[13px] text-[#777]">
                {T.posterViuErklaerung.replace("{anteil}", eur(DRUCK_KUENSTLER_CENTS, lang))}
              </span>
            </span>
          </label>
          {/* ── POSTER VIU IST PREMIUM (Owner 16.09.2026: „das ist aber eine premium funktion") ──
              Der Hinweis steht NEBEN der Funktion, die er gerade wollte — nicht irgendwo im
              Dashboard. Und er kommt mit dem Knopf: ein Satz „das kostet" ohne etwas zum Drücken
              ist eine Tür ohne Klinke (14.09.2026). */}
          {!start.abo && (
            <span className="mt-2 block max-w-[520px]">
              <span className="block text-[13.5px] font-semibold text-[#14181c]">{T.posterViuPremium}</span>
              <MandantKaufen mandant={mandant} k={k} abo wort={T.aboUpgradeKnopf}
                klasse="mt-2 inline-block rounded-xl bg-[#1d6fd0] px-5 py-2.5 text-[15px] font-extrabold text-white transition active:scale-[.99] disabled:opacity-60" />
            </span>
          )}
        </div>
      </div>

      {/* ── EINE AUFNAHME, DIE ÜBERALL LÄUFT (Owner 18.09.2026: „er kann nur ein Mal sich
          aufnehmen, um seine Kunst zu präsentieren, mit einem Bild im Hintergrund … und dieses
          Video erscheint bei jedem QR-Fenster, neben seinem Werk" · „man muss die Funktion auch
          beschreiben mit dem Video") ────────────────────────────────────────────────────────
          Sie liegt im Profil, nicht am Werk: einmal aufgenommen, spielt sie hinter jedem Code,
          den er drucken lässt. Der Satz darüber sagt genau das — sonst nimmt niemand etwas auf,
          von dem er nicht weiss, wo es landet. Premium, wie der Postershop. */}
      <div className="mt-8 max-w-[640px] border-t border-[#e5e5e5] pt-6">
        <span className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#777]">{T.stimmeTitel}</span>
        <p className="m-0 mt-2 text-[14.5px] leading-[1.55] text-[#555]">{T.stimmeProfilErklaerung}</p>
        {start.abo ? (
          <>
          {/* Das Skript: sein Text, in der Ich-Form, änderbar. */}
          <p className="m-0 mt-4 text-[13.5px] font-semibold text-[#14181c]">{T.stimmeSkriptHinweis}</p>
          <textarea value={skript} onChange={e => { setSkript(e.target.value); setStatus(""); }} rows={5} maxLength={1200}
            className={`${feld} mt-2 w-full resize-y py-1 text-[16px] leading-[1.6] text-[#333]`} />
          <StimmeAufnehmen
            mandant={mandant} schluessel={k} i={-2}
            vorhanden={!!start.stimme} videoDa={!!start.sprecher} stand={start.stimmeAm}
            /* Im Hintergrund steht ein Werk von ihm — das erste, das er hochgeladen hat. */
            werkBild={ausstehend[nrVon(kacheln[0]?.i ?? -1)] ?? bildUrl(nrVon(kacheln[0]?.i ?? -1))}
            youtubeId={start.youtube}
            text={skript}
            texte={{
              aufnehmen: T.stimmeAufnehmen, stoppen: T.stimmeStoppen, speichern: T.stimmeSpeichern,
              loeschen: T.stimmeLoeschen, laeuft: T.stimmeLaeuft, erklaerung: T.stimmeErklaerung,
              nurStimme: T.stimmeNurTon, mitVideo: T.stimmeMitVideo, nochmal: T.stimmeNochmal, weiter: T.stimmeWeiter,
              hgAus: T.hgAus, hgBlur: T.hgBlur, hgWerk: T.hgWerk, spiegeln: T.spiegelnWort, musik: T.musikWort,
              keinMikro: T.stimmeKeinMikro, keinBrowser: T.stimmeKeinBrowser,
              fehler: T.stimmeFehler, gespeichert: T.stimmeGespeichert,
            }} />
          </>
        ) : (
          <span className="mt-3 block">
            <span className="block text-[13.5px] font-semibold text-[#14181c]">{T.stimmePremium}</span>
            <MandantKaufen mandant={mandant} k={k} abo wort={T.aboUpgradeKnopf}
              klasse="mt-2 inline-block rounded-xl bg-[#1d6fd0] px-5 py-2.5 text-[15px] font-extrabold text-white transition active:scale-[.99] disabled:opacity-60" />
          </span>
        )}
      </div>

      {/* ── ÜBER MICH — mit eigenem Speichern und KI-Korrektur (Owner 13.09.2026) ──────────────
          Der Vorgabetext im leeren Feld nimmt die Hemmung: Wer „Erzähl Käufern etwas über dich"
          liest, muss einen fertigen Text können. „Schreib einfach frei" verlangt nur Stichworte. */}
      <textarea value={ueberMich} onChange={e => { setUeberMich(e.target.value); setStatus(""); setUeberStatus(""); }} rows={4} maxLength={1200}
        placeholder={T.ueberMichPlatzhalter} className={`${feld} mt-5 max-w-[640px] resize-y py-1 text-[16.5px] leading-[1.6] text-[#333]`} />
      <div className="mt-2.5 flex max-w-[640px] flex-wrap items-center gap-2.5">
        <button type="button" onClick={ueberMichKorrigieren} disabled={aiLaeuft || !ueberMich.trim()}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#111] px-4 py-2 text-[13.5px] font-semibold text-[#111] transition hover:bg-[#111] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#111]">
          {aiLaeuft ? T.aiLaeuft : T.aiKorrektur}
        </button>
        {/* Erscheint erst, wenn es etwas zurückzuholen gibt — und verschwindet nach dem Klick. */}
        {ueberMichVorher !== null && (
          <button type="button" title={T.zurueckVersion} aria-label={T.zurueckVersion}
            onClick={() => { setUeberMich(ueberMichVorher); setUeberMichVorher(null); setUeberStatus(""); }}
            className="inline-flex items-center rounded-full border border-[#dfe4e9] p-2 text-[#777] transition hover:border-[#111] hover:text-[#111]">
            <Undo2 className="h-[15px] w-[15px]" aria-hidden />
          </button>
        )}
        <button type="button" onClick={ueberMichSpeichern} disabled={ueberStatus === "speichert"}
          className="rounded-full bg-[#111] px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-[#333] disabled:opacity-50">
          {T.speichern}
        </button>
        {ueberStatus === "gespeichert" && <span className="text-[13.5px] font-semibold text-[#1a7f37]">{T.gespeichert}</span>}
        {ueberStatus === "fehler" && <span className="text-[13.5px] font-semibold text-[#b3261e]">{T.speichernFehler}</span>}
      </div>

      {/* ── DER TOTE AGENTEN-KNOPF IST RAUS (Owner 13.09.2026: „das raus") ──────────────────────
          Hier stand „Te interesează arta mea? Vorbește cu agentul meu." als graues, nicht
          klickbares `span` — eine Vorschau darauf, wie der Knopf für Käufer aussieht. In einem
          Formular, in dem alles andere antippbar ist, liest sich das als defekter Knopf, nicht
          als Vorschau. Wie seine Seite wirklich aussieht, zeigt „Vezi pagina ta online!" unten.
          Der ECHTE Agenten-Knopf steht unverändert auf der öffentlichen Seite. */}

      {/* ── SEINE WERKE — alle sofort, jede Kachel antippbar ── */}
      <h2 className="mt-14 border-t border-[#e5e5e5] pt-8 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#777]">{T.werke}</h2>
      {/* ── ER DARF ÜBERSCHREIBEN (Owner 18.09.2026: „was mir ein Künstler als Feedback gegeben
          hat: er hätte es gerne, dass er den Text im Trichter noch korrigieren kann") ────────
          Die Sätze schreibt der Algorithmus einmal im Trichter; danach steht der Künstler hier
          vor fertigem Text und weiss nicht, ob er ihn anfassen darf. Ein Satz beantwortet das —
          und nimmt dem erzeugten Text die Endgültigkeit. */}
      <p className="m-0 mt-3 max-w-[560px] text-[14.5px] leading-[1.5] text-[#555]">{T.texteUeberschreiben}</p>
      {/* ── DER HINWEIS — UND BEIM PREMIUM-FALL DER KNOPF DAZU ──────────────────────────────
          (Owner 14.09.2026) Ein Satz, der sagt „das kostet", ohne etwas zum Drücken, ist eine
          Tür ohne Klinke: Gemessen am 14.09.2026 sah KEINER der neun Künstler im Dashboard einen
          Kaufweg, weil der dortige Kasten an `aboFrageAm` hängt. Hier steht er jetzt direkt an
          der Funktion, die er gerade wollte.

          NICHT ROT: Ein Fehler ist rot. Dies ist kein Fehler — er hat nichts falsch gemacht. */}
      {hinweis && (
        <div className="mt-3">
          <p className={`m-0 text-[14px] font-semibold ${premium ? "text-[#14181c]" : "text-[#b3261e]"}`}>{hinweis}</p>
          {premium && (
            <MandantKaufen
              mandant={mandant}
              k={k}
              abo
              wort={T.aboUpgradeKnopf}
              klasse="mt-2 inline-block rounded-xl bg-[#1d6fd0] px-5 py-2.5 text-[15px] font-extrabold text-white transition active:scale-[.99] disabled:opacity-60"
            />
          )}
        </div>
      )}

      {/* ── DER KNOPF STEHT OBEN (Owner 12.09.2026: „der Button sollte oben stehen, nicht unten,
          weil die neuesten Bilder oben sind" · „hier wollte ich diesen Rahmen nicht") ───────────
          Vorher war er die letzte Kachel im Raster — bei zehn Werken muss man dafür an allem
          vorbeiscrollen. Und er sass in einer gestrichelten Fläche in Kachelgrösse, die wie ein
          leerer Platzhalter aussah. Jetzt steht der Knopf für sich, direkt über den Werken. */}
      {/**
        * ── DER KNOPF BLEIBT STEHEN UND WIRD GRAU (Owner 13.09.2026: „das ist Bullshit. Hier muss
        * Button stehen, ausgegraut. 10/10") ────────────────────────────────────────────────────
        *
        * Hier stand bei vollen Plätzen ein SATZ statt des Knopfes. Wer die Seite kennt, sucht an
        * dieser Stelle den Knopf — und findet Text. Das liest sich wie ein Fehler, nicht wie eine
        * Grenze.
        *
        * Jetzt bleibt er, wo er war, wird grau und zeigt „10/10". Der Zähler steht immer da, auch
        * wenn noch Platz ist: Die Grenze gehört vor die Auswahl, nicht hinter die Absage. Warum
        * er grau ist, sagt die Sprechblase — im Weg steht sie niemandem.
        *
        * OHNE TEXTSCHLÜSSEL: „7/10" ist in jeder Sprache dasselbe.
        */}
      {/**
        * GRAU, ABER KLICKBAR (Owner 13.09.2026: „eventuell wenn er versucht, dann kommt Meldung.
        * Du hast das Maximum an Uploads erreicht").
        *
        * Ein echtes `disabled` lässt sich nicht antippen — dann käme auch keine Meldung, und die
        * Sprechblase, die den Grund nennt, gibt es auf dem Telefon gar nicht. Dort stünde ein
        * grauer Knopf, der auf nichts reagiert; das ist derselbe stumme Fehlschlag, an dem
        * Szidonia heute morgen gescheitert ist.
        *
        * Deshalb: Er sieht gesperrt aus und sagt beim Antippen, warum.
        */}
      <button type="button" disabled={laedt}
        onClick={() => {
          /* Voll: anhalten und erklären — hier steht später der Weg zu Premium. */
          if (kacheln.length >= werkeMax) { setVollDialog(true); return; }
          setHinweis("");
          setKachelZiel(null);
          dateiKachel.current?.click();
        }}
        className={`mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-bold text-white transition disabled:opacity-50 ${
          kacheln.length >= werkeMax ? "bg-[#9aa3ab] hover:bg-[#8a939b]" : "bg-[#111] hover:bg-[#333]"}`}>
        <ImagePlus className="h-[18px] w-[18px]" aria-hidden />
        {T.bildHinzufuegen}
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[13px] font-bold tabular-nums">
          {kacheln.filter(x => hatBild(x.i)).length}/{werkeMax}
        </span>
      </button>
      <ul className="mt-6 grid list-none grid-cols-1 gap-x-8 gap-y-12 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {kacheln.map(kc => (
          <li key={kc.i}>
            <button type="button" onClick={() => { setKachelZiel(kc.i); dateiKachel.current?.click(); }}
              className="relative flex aspect-[4/5] w-full items-start justify-end overflow-hidden bg-[#f5f5f5]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {/* Vorgemerkte Bilder kommen aus dem Browser: Auf dem Server liegen sie erst nach „Speichern". */}
              {fehlt[nrVon(kc.i)] && !ausstehend[nrVon(kc.i)]
                ? <span className="grid h-full w-full place-items-center px-6 text-center text-[14px] text-[#777]">{T.bildPruefung}</span>
                : <img src={ausstehend[nrVon(kc.i)] ?? bildUrl(nrVon(kc.i))} alt="" className="max-h-full max-w-full object-contain"
                    onError={() => setFehlt(v => ({ ...v, [nrVon(kc.i)]: true }))} />}
              <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-[13px] font-semibold text-[#111] shadow">{T.bildTauschen}</span>
              {/* ── DER STAND, AUF DEM BILD (Owner 18.09.2026) ─────────────────────────────────
                  Oben links, damit er beim Überfliegen seiner Werke sofort sieht, was noch
                  wartet — ohne unter jede Kachel zu schauen. Grün heisst online, gelb heisst
                  wir schauen gerade, rot heisst: hier musst du etwas tun. */}
              {/* Ein Platz ohne jede Datei — das ist kein Zustand, sondern ein Loch. Er soll es
                  sehen und ein Bild hineinlegen können, statt sich über den Zähler zu wundern. */}
              {!staende[nrVon(kc.i)] && !ausstehend[nrVon(kc.i)] ? (
                <span className="absolute left-3 top-3 rounded-full bg-[#b3261e] px-3 py-1.5 text-[12.5px] font-bold text-white shadow">
                  {T.standLeer}
                </span>
              ) : null}
              {staende[nrVon(kc.i)] ? (
                <span className={`absolute left-3 top-3 rounded-full px-3 py-1.5 text-[12.5px] font-bold shadow ${
                  staende[nrVon(kc.i)].stand === "frei" ? "bg-[#1b7f4b] text-white"
                    : staende[nrVon(kc.i)].stand === "pruefung" ? "bg-[#a86a00] text-white"
                    : "bg-[#b3261e] text-white"}`}>
                  {staende[nrVon(kc.i)].stand === "frei" ? T.standFrei
                    : staende[nrVon(kc.i)].stand === "pruefung" ? T.standPruefung
                    : T.standAbgelehnt}
                </span>
              ) : null}
            </button>
            {/* Die Gründe stehen UNTER der Kachel, nicht darauf — sie sind zwei Zeilen lang und
                sagen ihm, was zu ändern ist. Dieselben Sätze wie in seiner Mail. */}
            {staende[nrVon(kc.i)]?.stand === "abgelehnt" && (staende[nrVon(kc.i)].gruende?.length || staende[nrVon(kc.i)].notiz) ? (
              <p className="m-0 mt-2 text-[13.5px] font-semibold leading-[1.45] text-[#b3261e]">
                {[...(staende[nrVon(kc.i)].gruende ?? []).map(g => (T as unknown as Record<string, string>)[g] ?? ""), staende[nrVon(kc.i)].notiz ?? ""]
                  .filter(Boolean).join(" · ")}
              </p>
            ) : null}
            <textarea value={kc.spruch} onChange={e => aendern(kc.i, "spruch", e.target.value)} rows={3} maxLength={280}
              placeholder={T.spruchPlatzhalter} className={`${feld} mt-4 resize-none py-1 text-[17px] font-semibold leading-[1.35]`} />
            {/**
              * ── EIN SATZ AUF ZURUF, JE WERK (Owner 13.09.2026: „man muss einen Button unter jedem
              * Werk machen. Beschreibung AI generieren") ──────────────────────────────────────────
              *
              * Der Hintergrundlauf nach dem Speichern schreibt alle fehlenden Sätze in einem Zug —
              * und wenn dabei einer ausbleibt, gibt es keinen zweiten Versuch. Hier kann sie es
              * selbst auslösen, so oft sie will, und einen Satz auch ersetzen.
              *
              * DER LADEZUSTAND HÄNGT AM WERK, nicht am Formular: Sonst drehten sich beim Klick auf
              * ein Bild alle zwölf Knöpfe, und niemand wüsste, welcher gerade arbeitet.
              */}
            {/**
              * ── „KUNST FREISTELLEN" (Owner 18.09.2026: „diese Künstler waren nicht in der Lage
              * die Kunst richtig zu posten. Sie haben drum herum fotografiert") ──────────────────
              *
              * Neben dem Satz-Knopf, weil beide dasselbe tun: Sie nehmen dem Künstler eine Arbeit
              * ab, die er selbst nicht machen mag. Und beide sind freiwillig und umkehrbar.
              *
              * Der zweite Druck holt das Original zurück — so ist der Knopf zugleich das
              * Vorher/Nachher, ohne dass daneben ein zweites Bild stehen muss.
              */}
            <button type="button" disabled={!!freiLaeuft[kc.i]}
              onClick={() => void freistellen(kc.i)}
              className="mt-1.5 mr-2 inline-flex items-center gap-1.5 rounded-full border border-[#dfe4e9] px-3 py-1.5 text-[12.5px] font-semibold text-[#555] transition hover:border-[#1d6fd0] hover:text-[#1d6fd0] disabled:opacity-50">
              <Crop className="h-[14px] w-[14px]" aria-hidden />
              {freiLaeuft[kc.i] ? T.freistellenLaeuft : (freiVorher[kc.i] !== undefined ? T.freistellenZurueck : T.freistellen)}
            </button>
            <button type="button" disabled={!!spruchLaeuft[kc.i]}
              onClick={() => void spruchSchreiben(kc.i)}
              className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#dfe4e9] px-3 py-1.5 text-[12.5px] font-semibold text-[#555] transition hover:border-[#1d6fd0] hover:text-[#1d6fd0] disabled:opacity-50">
              <Sparkles className="h-[14px] w-[14px]" aria-hidden />
              {spruchLaeuft[kc.i] ? T.spruchKiLaeuft : T.spruchKi}
            </button>
            {/* Daneben der Weg zurück (Owner 13.09.2026: „also neben Scrie cu AI") — je Werk,
                nur wenn für DIESES Werk eine vorige Fassung gemerkt ist. */}
            {spruchVorher[kc.i] !== undefined && (
              <button type="button" title={T.zurueckVersion} aria-label={T.zurueckVersion}
                onClick={() => {
                  aendern(kc.i, "spruch", spruchVorher[kc.i]);
                  setSpruchVorher(v => { const n = { ...v }; delete n[kc.i]; return n; });
                  /* Derselbe Knopf holt auch den Titel zurück, falls der Ki-Lauf ihn geändert
                     hat — beides gehört zusammen, aus demselben Klick entstanden. */
                  if (titelVorher[kc.i] !== undefined) {
                    aendern(kc.i, "titel", titelVorher[kc.i]);
                    setTitelVorher(v => { const n = { ...v }; delete n[kc.i]; return n; });
                  }
                }}
                className="ml-1.5 inline-flex items-center rounded-full border border-[#dfe4e9] p-1.5 text-[#777] transition hover:border-[#111] hover:text-[#111]">
                <Undo2 className="h-[13px] w-[13px]" aria-hidden />
              </button>
            )}
            {spruchAbsage[kc.i] && (
              <div className="mt-2">
                <p className={`m-0 text-[13.5px] font-bold leading-[1.4] ${spruchAbsage[kc.i] === "premium" ? "text-[#14181c]" : "text-[#b3261e]"}`}>
                  {spruchAbsage[kc.i] === "premium" ? T.aboKiGesperrt : spruchAbsage[kc.i] === "bild" ? T.spruchKeinBild : T.speichernFehler}
                </p>
                {spruchAbsage[kc.i] === "premium" && (
                  <MandantKaufen mandant={mandant} k={k} abo wort={T.aboUpgradeKnopf}
                    klasse="mt-1.5 inline-block rounded-xl bg-[#1d6fd0] px-4 py-2 text-[14px] font-extrabold text-white transition active:scale-[.99] disabled:opacity-60" />
                )}
              </div>
            )}
            {/* Welche Zeile wohin geht — sonst rät er (Owner 19.09.2026). */}
            <p className="m-0 mt-2.5 text-[13.5px] leading-[1.4] text-[#777]">{T.blattFelder}</p>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {([
                ["titel", T.titelPlatzhalter],
                ["technik", T.technikPlatzhalter],
                ["groesse", T.groessePlatzhalter],
                ["jahr", T.jahrPlatzhalter],
              ] as const).map(([f, platz]) => (
                <input key={f} value={kc[f]} onChange={e => aendern(kc.i, f, e.target.value)} placeholder={platz} maxLength={120}
                  className={`${feld} py-0.5 text-[14px] text-[#666]`} />
              ))}
            </div>
            {/* ALTE DETALII IN EIGENER ZEILE (Owner 11.09.2026: „hier kommt 100 zwei mal vor") — als fünftes kleines Feld neben
                Größe und Jahr sah es aus wie der Preis. */}
            <input value={kc.detalii} onChange={e => aendern(kc.i, "detalii", e.target.value)} maxLength={160}
              placeholder={T.detaliiPlatzhalter} className={`${feld} mt-1.5 py-0.5 text-[14px] text-[#666]`} />
            {/* DIE GESCHICHTE DES WERKS (Owner 11.09.2026: „wenn er das macht, wird sein Agent noch besser") — Käufer lesen sie
                nicht direkt, sein Agent erzählt daraus. Freiwillig. */}
            <textarea value={kc.geschichte} onChange={e => aendern(kc.i, "geschichte", e.target.value)} rows={3} maxLength={800}
              placeholder={T.geschichtePlatzhalter} className={`${feld} mt-2 resize-y py-1 text-[14.5px] leading-[1.5] text-[#444]`} />
            {/* DER PREIS JE WERK IST FREIWILLIG (Owner 12.09.2026: „wenn der künstler die preise
                genau einträgt bei seinen werken, dann erscheint das"). Lässt er ihn leer, steht an
                diesem Bild sein allgemeiner Satz von oben. Das Häkchen „Preis zeigen" gibt es nicht
                mehr: Wer einen Preis einträgt, will ihn zeigen. */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1.5">
                <span className="text-[13.5px] font-semibold text-[#555]">{T.preisSpanneWort}</span>
                <input value={kc.preis} onChange={e => aendern(kc.i, "preis", e.target.value)} maxLength={60}
                  placeholder={T.preisSpannePlatzhalter} className={`${feld} w-[170px] py-0.5 text-[14px] text-[#444]`} />
              </span>
              {/* WELCHES BILD IHN VERTRITT (Owner 12.09.2026) — es bestimmt das Vorschaubild beim
                  Teilen seiner Seite. Nur eines kann gesetzt sein; `vertrittSetzen` löscht die anderen. */}
              <label className="flex items-center gap-1.5 text-[13.5px] text-[#555]">
                <input type="checkbox" checked={kc.vertritt} onChange={e => vertrittSetzen(kc.i, e.target.checked)} />
                {T.vertritt}
              </label>
              {/* NUR WENN ER ÜBERHAUPT MITMACHT (Owner 16.09.2026: „auch bei jedem bild wenn er
                  das macht in seinem admin dann erscheint das in der kategorie") — solange das
                  grosse Häkchen aus ist, wäre diese Zeile an jedem Werk eine Frage zu einer Sache,
                  die er noch gar nicht gewählt hat. */}
              {posterViu ? (
                <label className="flex items-center gap-1.5 text-[13.5px] text-[#555]">
                  <input type="checkbox" checked={kc.poster} onChange={e => posterSetzen(kc.i, e.target.checked)} />
                  {T.posterViuWerk}
                </label>
              ) : null}
              {/* ── DARF DAS BILD EINES KUNDEN IN DIESEM STIL ENTSTEHEN ────────────────────
                  Owner 17.09.2026: „die künstler können das gar nicht einschalten. das ist ein
                  premium feature". Also steht die Zeile da, damit er sieht, DASS es das gibt —
                  aber grau und ohne Schalter; eingeschaltet wird sie vom Haus. Der Server nimmt
                  den Wert ohnehin aus dem Datensatz, nicht aus diesem Formular. */}
              {posterViu && kc.poster ? (
                <span className="flex items-center gap-1.5 text-[13.5px] text-[#999]">
                  <input type="checkbox" checked={kc.kunst} disabled readOnly />
                  {T.kunstWerk}
                  <span className="rounded bg-[#f0f0f0] px-1.5 py-0.5 text-[12px] font-semibold uppercase tracking-wide text-[#777]">{T.kunstPremium}</span>
                </span>
              ) : null}
            </div>
            {/* ── KEINE AUFNAHME MEHR JE WERK (Owner 18.09.2026: „das machen wir bei jedem Bild
                raus. Dafür machen wir es im Profil rein. Er kann nur ein Mal sich aufnehmen, um
                seine Kunst zu präsentieren, mit einem Bild im Hintergrund. Das ist auch ein
                Premium-Feature" · „und dieses Video erscheint bei jedem QR-Fenster, neben seinem
                Werk") ─────────────────────────────────────────────────────────────────────────
                Zehn Werke hiessen zehn Aufnahmen — die macht niemand, und wer eine machte, hatte
                sie bei neun Werken trotzdem nicht. EINE Aufnahme im Profil erscheint jetzt in
                jedem Fenster. Sie steht weiter oben, bei seinen Angaben. */}
            {/* ── EIN FILM JE POSTER, SELBST HOCHGELADEN (Owner 20.09.2026: „und bei jedem Poster in
                der Edit-Seite soll man ein Video hochladen können") ───────────────────────────
                Das ist NICHT die Aufnahme, die am 18.09. von hier ins Profil gewandert ist (die
                spricht über seine Kunst im Ganzen und läuft in jedem Fenster). Dies ist der Film
                zu DIESEM einen Werk: seine Geschichte, als eigene Folie am Poster und hinter dem
                Code — und daneben, wer will, das Blatt an einer Wand.
                Nur wo das Werk auch als Poster angeboten wird: Ohne Posterblatt gibt es keinen
                Slider, in dem der Film erscheinen könnte. */}
            {posterViu && kc.poster ? (
              <>
                <WerkFilmHochladen mandant={mandant} schluessel={k} i={kc.i} art="film"
                  vorhanden={!!kc.film} stand={kc.filmAm}
                  texte={{ titel: T.filmTitel, erklaerung: T.filmErklaerung, waehlen: T.filmWaehlen, ersetzen: T.filmErsetzen,
                    speichern: T.filmSpeichern, abbrechen: T.filmAbbrechen, loeschen: T.filmLoeschen, laedt: T.filmLaedt,
                    gespeichert: T.filmGespeichert, fehler: T.filmFehler, zuGross: T.filmZuGross, nurVideo: T.filmNurVideo }} />
                <WerkFilmHochladen mandant={mandant} schluessel={k} i={kc.i} art="wand"
                  vorhanden={!!kc.wandFilm} stand={kc.wandFilmAm}
                  texte={{ titel: T.wandFilmTitel, erklaerung: T.wandFilmErklaerung, waehlen: T.filmWaehlen, ersetzen: T.filmErsetzen,
                    speichern: T.filmSpeichern, abbrechen: T.filmAbbrechen, loeschen: T.filmLoeschen, laedt: T.filmLaedt,
                    gespeichert: T.filmGespeichert, fehler: T.filmFehler, zuGross: T.filmZuGross, nurVideo: T.filmNurVideo }} />
              </>
            ) : null}
            <button type="button" onClick={() => void entfernen(kc.i)}
              className="mt-2 text-[13px] text-[#777] underline hover:text-[#b3261e]">{T.entfernen}</button>
          </li>
        ))}
      </ul>

      {/* ── ALLES UNTEN, IMMER SICHTBAR (Owner 12.09.2026: „das machst du neben Salvează sticky,
          Preview statt Vezi…, alles unten sticky") ──────────────────────────────────────────
          IN DER LEISTE STEHT NUR NOCH, WAS VORWÄRTS FÜHRT (Owner 13.09.2026: „Șterge pagina raus.
          Soll am Ende der Seite stehen, nicht sticky"). Der Löschknopf klebte hier neben
          „Speichern" und fuhr bei jedem Schritt mit — der einzige unwiderrufliche Weg der Seite,
          dauerhaft in Daumenreichweite. Er steht jetzt am Seitenende, wo man ihn sucht, wenn man
          ihn will, und nicht findet, wenn man ihn nicht will. */}
      {/* Über der Leiste, damit sie den Speichern-Knopf nicht verdeckt. */}
      {bestaetigung ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[72px] z-50 flex justify-center px-5">
          <span className="rounded-full bg-[#1a7f37] px-5 py-2.5 text-[15px] font-bold text-white shadow-[0_4px_18px_rgba(0,0,0,.25)]">
            {bestaetigung}
          </span>
        </div>
      ) : null}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e5e5e5] bg-white/95 px-5 py-3 backdrop-blur">
        {/* EINE ZEILE, AUCH AUF DEM HANDY: Mit Umbruch fiel „Speichern" in eine zweite Reihe und
            stand dort allein links — der wichtigste Knopf am unerwartetsten Ort. Deshalb kein
            `flex-wrap`; stattdessen weicht das Entbehrliche: die Statusmeldung erscheint erst ab
            `sm`, und der Löschtext darf schrumpfen. Die beiden rechten Knöpfe nie (`shrink-0`). */}
        <div className="mx-auto flex max-w-[1120px] items-center gap-2 sm:gap-3">
          <span className={`mr-auto hidden text-[14px] font-semibold sm:block ${status === "fehler" ? "text-[#b3261e]" : "text-[#1d6fd0]"}`}>
            {laedt ? "…" : status === "gespeichert" ? T.gespeichert : status === "fehler" ? T.speichernFehler : ""}
          </span>

          {/**
            * ── BLAU UND GEFÜLLT, DAMIT ER GESEHEN WIRD (Owner 13.09.2026: „Preview Knopf sehen
            * die nicht. Mach es blau und schreib «Vezi pagina ta online!»") ────────────────────
            *
            * Er war ein schwarzer Umriss — dasselbe Aussehen wie der Löschknopf am anderen Ende,
            * nur spiegelverkehrt. Zwischen zwei Umrissen und einem gefüllten „Salvează" las ihn
            * niemand als Angebot.
            *
            * DAS PORTAL IST SONST SCHWARZ-WEISS („die einzige Farbe sind die Werke"). Diese
            * Ausnahme ist bewusst und bleibt auf die Bearbeiten-Ansicht beschränkt: Die sieht nur
            * der Künstler mit seinem Schlüssel, nie ein Käufer.
            */}
          <a href={oeffentlich}
            className="ml-auto shrink-0 rounded-full bg-[#1d6fd0] px-4 py-3 text-[14px] font-bold text-white no-underline transition hover:bg-[#1758a8] sm:ml-0 sm:px-6 sm:text-[15px]">
            {/* Am Handy das kurze Wort, ab sm der ganze Satz (Owner 13.09.2026: „dann nur auf dem
                PC ausschreiben") — dasselbe Muster wie „Autentificare artist" im Kopf. */}
            <span className="sm:hidden">{T.vorschauKurz}</span>
            <span className="hidden sm:inline">{T.vorschauOnline}</span>
          </a>
          <button type="button" onClick={() => void speichern()} disabled={status === "speichert" || laedt}
            className="shrink-0 bg-[#111] px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-[#333] disabled:opacity-50 sm:px-7 sm:text-[15px]">
            {T.speichern}
          </button>
        </div>
      </div>

      {/**
        * ── DAS LÖSCHEN STEHT AM ENDE (Owner 13.09.2026: „Șterge pagina raus. Soll am Ende der
        * Seite stehen, nicht sticky") ──────────────────────────────────────────────────────────
        *
        * Weit unten, hinter allen Werken, abgesetzt durch eine Linie und viel Luft: Wer seine
        * Seite löschen will, scrollt dorthin. Wer sie bearbeitet, kommt nie vorbei.
        *
        * DIE ZWEI STUFEN BLEIBEN: Der Knopf löscht nichts, er öffnet die Frage; und selbst das Ja
        * darin fordert nur die E-Mail an. Ruhig grau statt rot — Rot wäre eine Drohung, die hier
        * gar nicht eingelöst wird.
        *
        * `pb-32` am `main` trägt weiterhin den Abstand zur klebenden Leiste, damit dieser Bereich
        * nicht dahinter verschwindet.
        */}
      <div className="mt-20 border-t border-[#e5e5e5] pt-8">
        {loeschMail ? (
          <p className="m-0 text-[14px] font-semibold leading-[1.45] text-[#b3261e]">{T.loeschenMailGeschickt}</p>
        ) : (
          <button type="button" onClick={() => setLoeschDialog(true)}
            className="rounded-full border border-[#dfe4e9] px-4 py-2.5 text-[13.5px] font-semibold text-[#777] transition hover:border-[#b3261e] hover:text-[#b3261e]">
            {T.meineSeiteLoeschen}
          </button>
        )}
      </div>

      {/**
        * ── DAS MAXIMUM ALS FENSTER (Owner 13.09.2026: „hier muss doch klicken können, aber
        * Dialog öffnet sich") ──────────────────────────────────────────────────────────────────
        *
        * Der graue Knopf bleibt antippbar und hält hier an. Eine Sprechblase tat das nicht: Sie
        * erscheint nur mit Maus, auf dem Telefon war der Knopf grau und stumm.
        *
        * IN DIESE KNOPFZEILE KOMMT SPÄTER „PREMIUM KAUFEN" — dann steht die Entscheidung genau
        * dort, wo er sie treffen will: Er hat zehn Werke oben, seine Seite läuft, er will mehr
        * zeigen. Heute steht dort nur, was er ohne Geld tun kann.
        */}
      {vollDialog && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-5"
          role="dialog" aria-modal="true" onClick={() => setVollDialog(false)}>
          <div className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="m-0 font-serif text-[24px] font-normal leading-[1.2]">
              {T.werkeVollTitel.replace("{max}", String(werkeMax))}
            </h2>
            <p className="mt-3 text-[15.5px] leading-[1.55] text-[#444]">{T.werkeVollText}</p>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button type="button" onClick={() => setVollDialog(false)}
                className="rounded-full bg-[#111] px-5 py-2.5 text-[14.5px] font-semibold text-white transition hover:bg-[#333]">
                {T.verstanden}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DIE LÖSCHFRAGE ALS FENSTER (Owner 12.09.2026: „von mir aus Dialog") ─────────────────
          Sie steht über allem, nennt beim Namen, was verschwindet, und hat zwei gleichwertige
          Antworten. „Nein" liegt links und ist der ruhigere Knopf — wer hier landet, ist meistens
          aus Versehen hier. Und selbst das Ja löscht noch nichts: Es fordert nur die E-Mail an. */}
      {loeschDialog && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-5"
          role="dialog" aria-modal="true" onClick={() => setLoeschDialog(false)}>
          <div className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="m-0 font-serif text-[24px] font-normal leading-[1.2]">{T.loeschenTitel}</h2>
            {/* NICHT DER TEXT DER LÖSCHSEITE: Dort ist es endgültig, hier geht nur eine E-Mail
                raus (Owner 12.09.2026: „deine Seite wird hier nicht gelöscht"). */}
            <p className="mt-3 text-[15.5px] leading-[1.55] text-[#444]">{T.loeschenPerMailText}</p>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button type="button" onClick={() => setLoeschDialog(false)}
                className="rounded-full border border-[#111] px-5 py-2.5 text-[14.5px] font-semibold text-[#111] transition hover:bg-[#111] hover:text-white">
                {T.loeschenNein}
              </button>
              {/* Der Knopf sagt, was er tut — er schickt die Mail, er löscht nicht. Deshalb auch
                  kein Rot: Rot wäre hier eine Drohung, die nicht eingelöst wird. */}
              <button type="button" onClick={() => void loeschenAnfordern()}
                className="rounded-full bg-[#111] px-5 py-2.5 text-[14.5px] font-semibold text-white transition hover:bg-[#333]">
                {T.loeschenPerMail}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
