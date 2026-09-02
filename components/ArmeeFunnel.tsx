"use client";

import { useEffect, useRef, useState } from "react";
import {
  BildWahl, Eingabe, Fehlerzeile, Fortschritt, Haken, Kasten, Knopf,
  TunnelFortschritt, TunnelKacheln, TunnelKachelUpload, VorlagenKachel,
} from "@/components/CI";
import { Fine, H1, Kicker, Lead, Y } from "@/components/Landing";
import ImageCropper from "@/components/ImageCropper";
import EinladungKarte from "@/components/EinladungKarte";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import type { ArmeeTexte, DemoSzene } from "@/lib/demo-armee";

/**
 * DER VIDEO-TRICHTER DER INTERNATIONAL PEACE ARMEE (Owner 02.09.2026).
 *
 * ER IST EINE VARIANTE DES GEBURTSTAGS-TRICHTERS, KEINE NEUERFINDUNG. Der Owner hat den
 * Weg in drei Schritten festgelegt: erst „wie tryon", dann „lingerie tryon", dann — mit
 * Blick auf den Geburtstag — „aber geburtstag ist noch besser" · „genau das". Übernommen
 * ist deshalb dessen Aufbau, Bildschirm für Bildschirm:
 *
 *   Kopf         Kicker + eine grosse H1, die über ALLEN Schritten stehen bleibt
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

type Schritt = 1 | 2 | 3 | 4 | 5;

/** Gemessen an einem echten Pixverse-Lauf (02.09.2026): 40 Sekunden. Käme das Ergebnis
    sofort, wäre offensichtlich, dass nichts gerechnet wurde — und genau davon lebt der
    Moment. */
const DAUER_MS = 26_000;

export default function ArmeeFunnel({ szenen, texte, marke }: {
  szenen: DemoSzene[];
  /** Alle Wörter des Trichters in der Sprache der Seite (lib/demo-armee.ts). */
  texte: ArmeeTexte;
  /** Der Name der Organisation — steht im Kicker vor der Laufbahn. */
  marke: string;
}) {
  const [schritt, setSchritt] = useState<Schritt>(1);
  const [szeneId, setSzeneId] = useState(szenen[0]?.id ?? "");
  const [foto, setFoto] = useState("");
  /**
   * DER VORNAME STEHT VOR DER ERZEUGUNG (Owner 02.09.2026: „aber bei der generierung muss
   * peter seinen Vornamen schreiben sonst?").
   *
   * Der Abspann am Videoende spricht ihn mit Namen an — und das Formular kommt erst DANACH.
   * Ohne diese Zeile liefe das Video durch und der Abspann bliebe stumm, weil der Name noch
   * nirgends steht. Er wird deshalb hier gefragt, wo er ohnehin hingehört: Es ist die
   * Angabe, die das Video persönlich macht, und sie kostet einen Handgriff.
   */
  const [vorname, setVorname] = useState("");
  const [cropDatei, setCropDatei] = useState<File | null>(null);
  const [fortschritt, setFortschritt] = useState(0);

  const [name, setName] = useState("");
  const [geburt, setGeburt] = useState("");
  const [mail, setMail] = useState("");
  const [einwilligung, setEinwilligung] = useState(false);
  const [fehler, setFehler] = useState("");
  const [sendet, setSendet] = useState(false);

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
  const szene = szenen.find(s => s.id === szeneId) ?? szenen[0];
  const T = texte;

  useEffect(() => { window.scrollTo({ top: 0 }); }, [schritt]);

  /**
   * DIE ERZEUGUNG. In der Vorführung läuft nur die Uhr; danach steht das Video der
   * gewählten Szene. Im Betrieb hängt genau hier der echte Lauf (Bildmodell setzt das
   * Gesicht in die Szene, dann animiert Pixverse) — alles Sichtbare drumherum bleibt
   * gleich, damit der Umbau nur diese eine Stelle berührt.
   */
  useEffect(() => {
    if (schritt !== 3) return;
    const start = Date.now();
    const uhr = setInterval(() => {
      const anteil = Math.min(1, (Date.now() - start) / DAUER_MS);
      setFortschritt(Math.round(anteil * 100));
      if (anteil >= 1) { clearInterval(uhr); setSchritt(4); }
    }, 250);
    return () => clearInterval(uhr);
  }, [schritt]);

  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim());

  const absenden = () => {
    if (!name.trim()) return setFehler(T.fehlerName);
    if (!geburt) return setFehler(T.fehlerGeburt);
    if (!mailOk) return setFehler(T.fehlerMail);
    if (!einwilligung) return setFehler(T.fehlerHaken);
    setFehler(""); setSendet(true);
    /* Vorführung: Es geht nichts raus und nichts in den Bestand. Im Betrieb wird hier der
       Lead samt Foto gespeichert — dafür steht die Einwilligung darüber. */
    setTimeout(() => { setSendet(false); setSchritt(5); }, 900);
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
            id="" videoUrl={szene.video} poster={szene.bild}
            zaehlen={false} musik="" originalton schleife={false}
            /* 2:3 — genau das Format, in dem die Kette liefert (gpt-image 1024×1536, Pixverse
               übernimmt es). In 9:16 gepresst würde die Szene links und rechts beschnitten. */
            verhaeltnis="aspect-[2/3]"
            tonText={T.ton} tonAusText={T.tonAus} grossText={T.gross} kleinText={T.klein}
          />
        }
      />

      {/* Nur mit Namen und nur am Schluss. Ohne Namen bliebe „Danke ." stehen — schlimmer
          als gar kein Abspann. */}
      {abspann && vorname.trim() && (
        /**
          * FEST AN DER KARTE, NICHT ÜBER NEGATIVE ABSTÄNDE HOCHGESCHOBEN.
          *
          * Zuerst stand hier `-mt-[38%]`, und die zweite Zeile lag auf der unteren
          * Videokante. Ein negativer Abstand rechnet gegen die Höhe des Videos — die hängt
          * am Seitenverhältnis der Szene, also verschiebt sich der Text bei jedem anderen
          * Format wieder. Absolut zur Karte gesetzt sitzt er immer an derselben Stelle,
          * egal wie hoch das Video ist.
          */
        <div className="pointer-events-none absolute inset-x-0 bottom-[22%] px-6 text-center">
          <p className="text-[24px] font-black leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            {T.abspannEins.replace("{name}", vorname.trim())}
          </p>
          <p className="mt-1.5 text-[18px] font-black text-[#f6cf51] drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            {T.abspannZwei}
          </p>
        </div>
      )}
    </div>
  ) : null;

  /* Der Kopf bleibt über allen Schritten stehen — wie beim Geburtstag. */
  const kopf = (
    <>
      <Kicker>{marke} · {T.kicker}</Kicker>
      <H1>
        {T.claimEins} <Y>{T.claimZwei}</Y> {T.claimDrei}
      </H1>
      <div className="mt-3"><TunnelFortschritt schritte={[1, 2, 3]} aktuell={Math.min(schritt, 3)} /></div>
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
            <p className="mt-5 text-[12px] font-black uppercase tracking-wide text-white/50">{T.wahlLabel}</p>
            <div className="mt-2">
              {/* Grosse Wisch-Vorlagen mit Namen darunter und Lupe — man sieht, WAS man
                  wählt, nicht eine Briefmarke davon. Beide Zustände tragen denselben Ring,
                  es wechselt nur die Farbe. */}
              {/**
                * OHNE LUPE (Owner 02.09.2026: „in der vergrösserten version nicht und da
                * bauen wir die karte nicht").
                *
                * `vergroessern` öffnet die Vorlagen-Überlagerung des Hauses — und die baut
                * immer die Einladungskarte nach, mitsamt Ornamenten, dem Titel
                * „Hochzeitseinladung" und der Herkunftszeile. Für eine Anzeigen-Szene ist
                * das falsch, und ein eigenes Vollbild danebenzustellen wäre eine zweite
                * Bauart für dieselbe Geste. Die Kachel ist gross genug, um zu erkennen,
                * was man wählt; das Video läuft am Ende ohnehin in voller Grösse.
                */}
              <BildWahl gross sprache="de"
                bilder={szenen.map(s => ({ id: s.id, name: s.name, bild: s.bild, poster: s.bild }))}
                wert={szeneId} waehle={setSzeneId} />
            </div>
            <div className="mt-5">
              <Knopf art="gold" onClick={() => setSchritt(2)}>{T.weiter}</Knopf>
            </div>
          </>
        )}
      </>
    );
  }

  /* ══ 2 · Dein Foto ══ */
  if (schritt === 2) {
    return (
      <>
        {kopf}
        <p className="mt-5 text-[12px] font-black uppercase tracking-wide text-white/50">{T.videoLabel}</p>

        <div className="mt-2">
          <TunnelKacheln
            zurueckLabel={T.zurueck}
            aufZurueck={() => setSchritt(1)}
            links={
              <TunnelKachelUpload
                foto={foto} titel={T.fotoKachel} hinweis={T.fotoHinweis}
                onWaehlen={() => fotoRef.current?.click()}
                onLoeschen={foto ? () => setFoto("") : undefined}
              />
            }
            ziel={szene ? (
              /* Ohne `videoUrl` bleibt die Kachel ein reines Bild: kein Tipp, kein
                 Overlay — aus demselben Grund wie oben. */
              <VorlagenKachel bildUrl={szene.bild} beschriftung={szene.name} sprache="de" />
            ) : null}
            zielLabel={T.zielLabel}
            /* `zusatz` ist der Platz für produktspezifische Angaben UNTER den Kacheln —
               nie ein eigener Schritt (KONZEPT-TUNNEL.md). */
            zusatz={
              <div className="mt-4">
                <Eingabe placeholder={T.vornameFeld} value={vorname}
                  onChange={e => setVorname(e.target.value)} />
                <Fine>{T.vornameHinweis}</Fine>
              </div>
            }
            knopf={{
              text: T.generieren,
              disabled: !foto || !szene || !vorname.trim(),
              onClick: () => { setFortschritt(0); setSchritt(3); },
            }}
            einwilligung={<>
              {T.einwilligungEins}
              {" "}<span className="block">{T.einwilligungZwei}</span>
            </>}
          />
        </div>

        <input ref={fotoRef} type="file" accept="image/*,.heic,.heif" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) setCropDatei(f); e.target.value = ""; }} />

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

  /* ══ 3 · Die Erzeugung ══ */
  if (schritt === 3) {
    return (
      <>
        {kopf}
        <div className="mt-6">
          <Kasten polster="p-5">
            {/* Ein Balken mit Wort, nie ein Kreisel allein — sonst rät der Nutzer, ob
                gearbeitet wird oder etwas hängt. */}
            <Fortschritt text={`${T.laeuftText} „${szene?.name}“`} prozent={fortschritt} />
            <Fine>{T.laeuftDauer}</Fine>
          </Kasten>
        </div>
      </>
    );
  }

  /* ══ 4 · Das Ergebnis, darunter die Frage ══ */
  if (schritt === 4) {
    return (
      <>
        <Kicker>{T.fertigKicker}</Kicker>
        <H1>{T.fertigTitelEins} <Y>{T.fertigTitelZwei}</Y>.</H1>

        {beispielKarte}

        {/* DIE FRAGE KOMMT NACH DEM GESCHENK. Wer gerade etwas bekommen hat, gibt eher
            etwas zurück — deshalb steht das Formular hier und nicht am Anfang. */}
        <div className="mt-8">
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
              <Eingabe type="email" inputMode="email" placeholder={T.feldMail}
                value={mail} onChange={e => setMail(e.target.value)} />

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
      <Kicker>{T.dankeKicker}</Kicker>
      <H1>{T.dankeTitelEins} <Y>{T.dankeTitelZwei}</Y>.</H1>
      <Lead>
        {T.dankeText}
      </Lead>
      <div className="mt-6">
        <Knopf art="umriss" onClick={() => {
          setSchritt(1); setFoto(""); setVorname(""); setName(""); setGeburt(""); setMail(""); setEinwilligung(false);
        }}>{T.nochmal}</Knopf>
      </div>
    </>
  );
}
