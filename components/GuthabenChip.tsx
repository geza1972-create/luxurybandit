"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, Images, AlertTriangle } from "lucide-react";
import { guthabenLesen, geraetAdresse, aktiveAdresse, type Gestrandet } from "@/lib/guthaben-konto";
import { AUFLADE_STUFEN, eur } from "@/lib/pricing";

/**
 * DAS GUTHABEN IM KOPF DER SEITE (Owner 03.08.2026: „könnte das Guthaben im Header stehen?
 * vielleicht benutzt er das für was anderes noch — mit Icon bitte").
 *
 * Der Gedanke dahinter: Das Guthaben ist GELD, kein Kuss-Detail. Wer 9,99 aufgeladen und
 * 1,49 ausgegeben hat, traegt 8,50 € mit sich herum — und soll sie auf JEDER Seite sehen,
 * nicht nur tief im Kuss-Trichter. Was sichtbar ist, wird ausgegeben; was unsichtbar ist,
 * fuehlt sich weg an (dieselbe Lehre wie bei der Kontostand-Zeile im Trichter).
 *
 * WEN WIR KENNEN: die eingetippte Kuss-Adresse (lb_kiss_mail) oder das angemeldete Konto.
 * Ohne Adresse zeigt der Chip NICHTS — einem Fremden „0,00 €" an den Kopf zu stellen waere
 * eine Abweisung, keine Auskunft. Der Klick fuehrt zum Kuss-Trichter: Dort wohnt der
 * Aufladen-Knopf.
 *
 * Aktualisiert sich beim Fensterwechsel (`focus`): Wer im Kassen-Popup aufgeladen hat und
 * zurueckkommt, sieht den neuen Stand, ohne neu zu laden.
 */
export default function GuthabenChip() {
  const [cents, setCents] = useState<number | null>(null);
  /**
   * KONTO UND GALERIE STEHEN JETZT IMMER DA (Owner 04.08.2026, mit einem Bild der leeren
   * Kopfzeile: „was fehlt uns hier? Baue sie bitte ein ohne mich zu fragen").
   *
   * Bis heute war die Regel: kein Guthaben, kein Chip — „einem Fremden 0,00 € an den Kopf zu
   * stellen waere eine Abweisung". Der Gedanke stimmt fuer eine Zahl, aber nicht fuer den
   * WEG: Wer neu kommt, sieht sonst nirgends, dass es ueberhaupt ein Konto und eine Galerie
   * gibt — und beides ist ab dem ersten Kauf sein wichtigster Knopf.
   *
   * Deshalb: Der Chip steht immer, `0,00 €` inklusive, und fuehrt dorthin, wo aufgeladen
   * wird. NUR Models sehen weiterhin nichts (`istModel`) — fuer sie gibt es dieses Konto
   * nicht, und ein leerer Geldbeutel im Kopf wuerde ihnen etwas versprechen, das es fuer sie
   * nicht gibt.
   */
  const [istModel, setIstModel] = useState(false);
  /** Video-Credits aus dem aelteren System (Abo/Extra-Kaeufe) — wer davon welche hat,
   *  ist NICHT „leer", auch wenn das Euro-Guthaben 0 ist (Owner-Fall tigl10722, 03.08.2026). */
  const [links, setLinks] = useState(0);
  /**
   * GELD AUF EINER ANDEREN ADRESSE DIESES GERAETS (Owner 03.08.2026: „mein Kontostand zeigt
   * 0 Euro an, aber ich habe Geld drauf").
   *
   * Er hatte recht UND der Chip hatte recht: 8,50 € lagen auf der einen Adresse, angemeldet
   * war er mit einer anderen. Ein blankes „0,00 €" ist in diesem Moment zwar wahr, aber die
   * unbrauchbarste aller Antworten — es sagt genau das Gegenteil dessen, was der Fall ist.
   * Also warnt der Chip statt zu behaupten; die Aufloesung steht im Trichter, wohin er fuehrt.
   */
  const [gestrandet, setGestrandet] = useState<Gestrandet | null>(null);
  /**
   * AUFLADEN DIREKT AM CHIP (Owner 05.08.2026: „wenn er auf Konto klickt, dann soll er
   * aufladen können" · „es muss doch ein Modal sich öffnen, wo er auswählen kann, dann zum
   * Stripe").
   *
   * Bis hierher führte der Chip auf die Kuss-Seite — dort wohnte der Aufladen-Knopf. Das ist
   * ein Umweg über eine fremde Seite für etwas, das mit dem Kuss nichts zu tun hat: Sein Geld
   * gehört ihm auf JEDER Seite, also auch der Weg, es aufzufüllen.
   *
   * Die Stufen kommen aus `lib/pricing` (AUFLADE_STUFEN) — dieselbe Leiter, die die Kasse als
   * Whitelist prüft. Ein Betrag, den der Chip anbietet und die Kasse nicht kennt, kann es
   * damit nicht geben.
   */
  const [offen, setOffen] = useState(false);
  const [mail, setMail] = useState("");
  const [busy, setBusy] = useState(0);
  const [fehler, setFehler] = useState("");

  const aufladen = async (stufe: number) => {
    const adresse = (mail || geraetAdresse()).trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adresse)) {
      setFehler("Bitte gib deine E-Mail-Adresse an — auf sie wird das Guthaben gebucht.");
      return;
    }
    setBusy(stufe); setFehler("");
    /**
     * DIE ADRESSE MUSS AUF DEM GERAET BLEIBEN — SONST SIEHT ER NACH DER ZAHLUNG 0,00 €
     * (Owner 05.08.2026: „ich hoffe, der ist dann eingeloggt, wenn er die E-Mail-Adresse
     * eingibt und zahlt … nicht dass er dann 0 Euro sieht").
     *
     * Er hat den Fehler beschrieben, bevor er passiert ist: Das Guthaben wird auf die Adresse
     * gebucht, die HIER im Feld steht — der Chip liest aber die Adresse, die auf dem Geraet
     * gespeichert ist. Tippt er eine neue ein, laege das Geld auf der einen und der Chip
     * schaute auf die andere. Genau der Fall, den es am 03.08. schon einmal gab (8,50 € auf
     * der zweiten Adresse, Memory `guthaben-haengt-an-einer-adresse`).
     *
     * Also: erst merken, dann zahlen. Danach liest der Chip dieselbe Adresse, auf die Stripe
     * gebucht hat — und beim Zurueckkommen steht der neue Stand da.
     */
    try { localStorage.setItem("lb_kiss_mail", adresse); } catch { /* privater Modus */ }
    try {
      const r = await fetch("/api/kiss-video-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aufladen: true, topupCents: stufe, email: adresse, returnTo: window.location.pathname }),
      }).then(x => x.json());
      /* Kein Popup, sondern derselbe Tab: Der Chip steht in der Kopfzeile jeder Seite, und
         ein Fenster, das der Browser blockiert, sähe hier aus wie ein toter Knopf. */
      if (r?.url) { window.location.href = String(r.url); return; }
      setFehler(String(r?.error || "Die Kasse ging nicht auf. Bitte noch einmal."));
    } catch {
      setFehler("Keine Verbindung. Bitte noch einmal.");
    }
    setBusy(0);
  };

  /**
   * DER PULS AM GALERIE-CHIP (Owner 08.08.2026: „und muss auch auf das Galerie Chip ein
   * punkt pulsieren"). Solange ein bezahlter Auftrag ohne fertiges Video laeuft
   * (`rendert` aus /api/my-videos), traegt der Chip einen pulsierenden Goldpunkt — der
   * Kaeufer sieht ohne die Galerie zu oeffnen, dass gearbeitet wird. Nachgefragt wird
   * nur, solange wirklich etwas laeuft (alle 30 s), sonst einmal je Anlass: Seitenstart
   * und jede Guthaben-Meldung des Trichters (die Zahlung ist der Startschuss).
   */
  const [rendert, setRendert] = useState(false);
  useEffect(() => {
    let weg = false;
    let takt: ReturnType<typeof setTimeout> | null = null;
    const pruefen = async () => {
      try {
        let device = "";
        try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
        const mail = aktiveAdresse();
        if (!device && !mail) { if (!weg) setRendert(false); return; }
        const d = await fetch(`/api/my-videos?device=${encodeURIComponent(device)}&email=${encodeURIComponent(mail)}`, { cache: "no-store" }).then(r => r.json());
        if (weg) return;
        /* „bis der user die galerie öffnet" (Owner 08.08.2026): Der Punkt ist eine
           Benachrichtigung. Gezaehlt wird nur, was NACH dem letzten Galerie-Besuch
           gestartet ist — ISO-Zeiten vergleichen sich als Text. */
        let gesehen = "";
        try { gesehen = localStorage.getItem("lb_galerie_gesehen") ?? ""; } catch { /**/ }
        const laeuft = Array.isArray(d?.pictures) && d.pictures.some((x: { rendert?: boolean; rendertSeit?: string; createdAt?: string }) =>
          x.rendert === true && String(x.rendertSeit || x.createdAt || "") > gesehen);
        setRendert(laeuft);
        if (laeuft) takt = setTimeout(() => { void pruefen(); }, 30_000);
      } catch { /* Anzeige-Schmuck — ein Netzfehler darf nichts kaputtmachen */ }
    };
    void pruefen();
    const anlass = () => { void pruefen(); };
    window.addEventListener("lb-guthaben-neu", anlass);
    window.addEventListener("lb-galerie-gesehen", anlass);
    return () => { weg = true; if (takt) clearTimeout(takt); window.removeEventListener("lb-guthaben-neu", anlass); window.removeEventListener("lb-galerie-gesehen", anlass); };
  }, []);

  useEffect(() => {
    let weg = false;
    const holen = () => {
      /**
       * BEI MODELS KEIN GUTHABEN (Owner 03.08.2026: „kein Guthaben bei den Models").
       *
       * Models sind keine Kunden: Ihr Credit-System ist ein anderes und liegt seit dem
       * 01.08.2026 eingefroren (kein Startguthaben, kein Verdienen). Ein Kunden-Konto im
       * Header wuerde ihnen ein Guthaben versprechen, das es fuer sie nicht gibt — und die
       * Galerie daneben zeigt ohnehin die Kunden-Sicht. Gilt auch fuer den Vorschau-Modus
       * („View as model"), sonst sieht der Owner beim Pruefen etwas anderes als das Model.
       */
      let model = false;
      try {
        model = !!(JSON.parse(localStorage.getItem("lb_curator") ?? "{}")?.id) || !!localStorage.getItem("lb_preview_model");
      } catch { /**/ }
      setIstModel(model);
      if (model) { setCents(null); return; }
      // Welche Adresse gilt, entscheidet lib/guthaben-konto — dieselbe Regel wie im Trichter.
      void guthabenLesen().then(stand => {
        if (weg) return;
        if (!stand) { setCents(null); return; }
        setCents(stand.cents);
        setLinks(stand.links);
        setGestrandet(stand.gestrandet);
      });
    };
    holen();
    window.addEventListener("focus", holen);
    // Beim Abmelden sofort leeren — nicht erst beim naechsten Fensterwechsel (03.08.2026).
    const abmelden = () => { setCents(null); setGestrandet(null); };
    window.addEventListener("lb-abgemeldet", abmelden);
    // Der Trichter meldet Adress-Bestaetigung und jede Guthaben-Aenderung — der Chip
    // zieht sofort nach, ohne Fensterwechsel (Owner 03.08.2026).
    window.addEventListener("lb-guthaben-neu", holen);
    return () => { weg = true; window.removeEventListener("focus", holen); window.removeEventListener("lb-abgemeldet", abmelden); window.removeEventListener("lb-guthaben-neu", holen); };
  }, []);

  /**
   * DANEBEN DIE GALERIE (Owner 03.08.2026: „mach ein Button neben Konto im Header zu My
   * Galerie, ähnlich wie mein Konto"). Beide gehoeren zusammen: Das eine ist sein Geld, das
   * andere das, was er dafuer bekommen hat. Die Galerie erscheint unter derselben Bedingung
   * wie das Konto — wir kennen ihn. Ein Fremder haette dort ohnehin nur die Leere stehen.
   */
  /* Nur Models sehen nichts. Alle anderen sehen Konto und Galerie — unbekannt heisst 0,00 €
     und nicht „unsichtbar" (siehe oben). */
  if (istModel) return null;
  const stand = typeof cents === "number" ? cents : 0;
  const chip = "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-black transition active:scale-95";
  /**
   * DER WARN-ZUSTAND: leeres Konto, aber auf einer anderen Adresse dieses Geraets liegt Geld.
   * Statt „0,00 €" (wahr, aber irrefuehrend) steht dann ein Warndreieck mit dem Betrag, der
   * WIRKLICH existiert — und der Klick fuehrt in den Trichter, wo der Satz dazu steht.
   */
  return (
    <span className="flex items-center gap-2">
      {/**
        * EIN `span`, KEIN `button` (05.08.2026, nachdem der Chip in der hellen Fassung leer
        * war): `.lb-fb [data-langrow="1"] button` faerbt JEDEN Knopf dieser Kopfzeile weiss —
        * die Regel gehoert dem Sprachumschalter daneben. Als ich den Chip vom Link zum Knopf
        * gemacht habe, hat sie ihn mitgenommen: weisse Pille, weisse Schrift, nichts zu sehen.
        * `role="button"` verhaelt sich fuer Maus, Tastatur und Vorleser gleich, faellt aber
        * nicht unter die Regel — und der Chip sieht wieder aus wie vorher.
        */}
      <span role="button" tabIndex={0} aria-label="Guthaben"
        onClick={() => { setFehler(""); setMail(geraetAdresse()); setOffen(true); }}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFehler(""); setMail(geraetAdresse()); setOffen(true); } }}
        className={`cursor-pointer ${chip} ${gestrandet
          ? "border-[#e0794a]/50 bg-[#e0794a]/10 text-[#e0794a]"
          : "border-[#f6cf51]/40 bg-[#f6cf51]/10 text-[#f6cf51]"}`}>
        {gestrandet ? <AlertTriangle className="h-3.5 w-3.5" /> : <Wallet className="h-3.5 w-3.5" />}
        {gestrandet
          ? (gestrandet.cents > 0
            ? `${(gestrandet.cents / 100).toFixed(2).replace(".", ",")} €`
            : `${gestrandet.links} 🎬`)
          : stand > 0 || links <= 0
            ? `${(stand / 100).toFixed(2).replace(".", ",")} €`
            : `${links} 🎬`}
      </span>
      <Link href="/my-gallery" aria-label="My Gallery"
        className={`relative ${chip} border-white/20 bg-white/5 text-white/85`}>
        <Images className="h-3.5 w-3.5" />
        Galerie
        {/* Der Puls: dort entsteht gerade etwas. Gold wie der Akzent, nie ein zweiter Farbton. */}
        {rendert && <span aria-hidden className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-[#f6cf51]" />}
      </Link>

      {offen && (
        /**
         * DUNKEL MIT GOLD — WIE DER CHIP SELBST (Owner 05.08.2026, mit Bild: „das ist
         * hässlich. Du musst das in diesem Design machen", daneben der Konto-Chip).
         *
         * Hier stand ein weisses Blatt mit fünf fetten Goldbalken. Das war zweimal falsch: Es
         * gehört nicht zur Seite (die ist dunkel), und fünf gefüllte Goldknöpfe untereinander
         * sind fünf Hauptaktionen — die Hausregel lässt genau EINE zu (Skill `ci-design`).
         *
         * Jetzt ist es dieselbe Sprache wie der Chip, den er angetippt hat: dunkler Grund,
         * goldener Rand, goldene Schrift. Die Beträge sind Chips in einem Raster, keine
         * Balken; sie stehen nebeneinander statt untereinander und passen damit ohne Scrollen
         * auf jeden Bildschirm.
         *
         * z-[95]: über der Kopfzeile (z-50) und den Trichter-Dialogen (z-40), unter dem
         * Adress-Tor (z-96) — es soll nichts verdecken, was dringender ist.
         */
        <div className="fixed inset-0 z-[95] grid place-items-center p-5" style={{ background: "rgba(0,0,0,0.78)" }}
          onClick={() => setOffen(false)}>
          {/* KLASSEN STATT INLINE-FARBEN — sonst gibt es die helle Fassung nicht (Owner
              05.08.2026: „und auch in light dann"). Ein `style={{background:'#141110'}}` ist
              für `.lb-theme`/`.lb-fb` unerreichbar; `bg-[#111]` dagegen kennt globals.css und
              macht daraus in der hellen Fassung Weiss mit Schatten. Genauso `text-white` →
              dunkel und jedes `#f6cf51` → Blau. Damit stimmt der Dialog in beiden Fassungen,
              ohne dass hier eine zweite Farbtabelle steht. */}
          <div className="w-full max-w-[340px] rounded-3xl border border-[#f6cf51]/30 bg-[#111] p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
            onClick={e => e.stopPropagation()}>
            <p className="text-[17px] font-black leading-snug text-white">Konto aufladen</p>
            <p className="mt-1 text-[12.5px] font-bold text-white/60">
              Aktuell: {(stand / 100).toFixed(2).replace(".", ",")} €
            </p>

            {/* DIE ADRESSE ENTSCHEIDET, WO DAS GELD LANDET (Memory `guthaben-haengt-an-einer-adresse`).
                Kennen wir sie, steht sie schon im Feld — korrigieren darf er sie, solange kein
                Geld geflossen ist. Danach ist es zu spät: Guthaben wird nie umgebucht. */}
            <input value={mail} onChange={e => { setMail(e.target.value); if (fehler) setFehler(""); }}
              type="email" inputMode="email" autoComplete="email" placeholder="du@email.com"
              className="lb-eingabe mt-4 h-11 w-full rounded-xl border border-white/30 bg-white/[0.08] px-3 text-center text-[14px] font-bold text-white outline-none placeholder:text-white/50 focus:border-[#f6cf51]" />

            {fehler && (
              <p role="alert" style={{ color: "#ef4444" }} className="mt-2 text-[12.5px] font-black leading-snug">{fehler}</p>
            )}

            {/* Drei nebeneinander, dann zwei — dieselbe Form wie der Chip, nur grösser. */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {AUFLADE_STUFEN.map(stufe => (
                /* `span` statt `button` — aus demselben Grund wie beim Chip oben: In der
                   hellen Fassung greifen Knopf-Regeln, die diese Pillen weiss faerben; dann
                   steht heller Text auf hellem Grund und die Betraege sind unsichtbar. Als
                   `role="button"` verhalten sie sich gleich und behalten ihre Farbe. */
                <span key={stufe} role="button" tabIndex={busy > 0 ? -1 : 0}
                  onClick={() => { if (!busy) void aufladen(stufe); }}
                  onKeyDown={e => { if (!busy && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); void aufladen(stufe); } }}
                  className={`flex h-11 cursor-pointer items-center justify-center rounded-full border border-[#f6cf51]/40 bg-[#f6cf51]/10 text-[14px] font-black text-[#f6cf51] transition active:scale-95 ${busy > 0 ? "opacity-40" : ""}`}>
                  {busy === stufe ? "…" : eur(stufe, "de")}
                </span>
              ))}
            </div>

            <p className="mt-4 text-center text-[10.5px] font-medium leading-snug text-white/45">
              Guthaben verfällt nie · keine Barauszahlung
            </p>
            <button type="button" onClick={() => setOffen(false)}
              className="mt-3 flex h-10 w-full items-center justify-center rounded-full border border-white/20 text-[13px] font-black text-white/85 active:scale-95 transition">
              Zurück
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
