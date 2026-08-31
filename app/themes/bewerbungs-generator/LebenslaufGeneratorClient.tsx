"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, FileText, ImagePlus, Maximize2 } from "lucide-react";
import { Knopf, Kasten, Eingabe, Fehlerzeile, Fortschritt, FlaggeDe, Scheibe, BlattUeberlagerung } from "@/components/CI";
import { kasseOeffnen, kassenFenster } from "@/lib/browser-erkennen";
import { useKasseImFenster } from "@/components/KasseImFenster";
import { logFunnelEvent } from "@/lib/track-funnel";
import { PDF_VORLAGEN, vorlagenBild } from "@/lib/pdf-vorlagen";
import type { GeneratorTexte } from "@/lib/bewerbungs-generator-i18n";

/**
 * DER LEBENSLAUF-GENERATOR — HOCHLADEN, NACHFRAGEN, FERTIG (Owner 31.08.2026).
 *
 * Sein Ablauf, wörtlich: „er kann ein Eingabefeld bekommen. Er soll gefragt werden. Als
 * Minichat vielleicht. Dir fehlt noch das … und abfragen, dann: jetzt habe ich alles, soll
 * ich das erstellen? Ja. Dann machst du die Vorschau. Dann kaufen ohne Wasserzeichen."
 *
 * DER MINICHAT KOSTET NICHTS. Nach dem Auslesen steht fest, welche Felder leer sind — der
 * Server schickt sie als Liste mit. Der Chat geht genau die durch, ohne ein einziges Modell
 * zu fragen. Das ist nicht nur billiger, sondern verlässlicher: Eine echte Chat-Maschine
 * kann abschweifen, diese Abfolge nicht.
 *
 * KEINE ADRESSE VORAB (Owner: „Adresse, hat er im CV"). Sie wird ausgelesen; fehlt sie,
 * fragt der Chat danach wie nach allem anderen.
 */

type Kurz = {
  name: string; email: string; telefon: string; ort: string;
  positionierung: string; stationen: number; ausbildung: number; sprachen: number; ohneFoto: boolean;
};
/**
 * DIE VORLAGE KOMMT ZUERST (Owner 31.08.2026: „und Template auswählen, wann kommt das? Das
 * kommt zuerst").
 *
 * Und das ist auch richtig herum gedacht: Wer sieht, wie das Ergebnis aussehen wird, lädt
 * eher hoch. Umgekehrt — erst die Arbeit, dann die Auswahl — fühlt sich die Wahl an wie eine
 * weitere Hürde vor dem Ziel.
 */
type Phase = "vorlage" | "eingabe" | "chat" | "fertig";

/* Welches Textfeld zu welchem fehlenden Profilfeld gehört — als Typ, nicht als Zeichenkette:
   Ein Tippfehler hier wäre sonst erst im Browser als leere Frage aufgefallen. */
const FRAGE: Record<string, keyof GeneratorTexte> = {
  name: "fragename", email: "frageemail", telefon: "fragetelefon", ort: "frageort",
};

export default function LebenslaufGeneratorClient({ S, lang, preisText, zielsprache }: {
  S: GeneratorTexte; lang: string; preisText: string;
  /**
   * „de" macht aus demselben Werkzeug den deutschen Lebenslauf (Owner 31.08.2026). EIN
   * Motor, zwei Türen: Der Code ist ein Schalter, im Verkauf sind es zwei Versprechen —
   * dieselbe Trennung wie zwischen /joburi und /recruiting.
   */
  zielsprache?: "de";
}) {
  const [cvPath, setCvPath] = useState("");
  const [cvName, setCvName] = useState("");
  const [foto, setFoto] = useState("");
  const [genId, setGenId] = useState("");
  const [phase, setPhase] = useState<Phase>("vorlage");
  /* Auf der deutschen Tür ist die deutsche Form voreingestellt — sie ist der Grund, warum
     jemand dort ist. Wählbar bleiben alle. */
  const [vorlage, setVorlage] = useState(
    zielsprache === "de" ? (PDF_VORLAGEN.find(v => v.deutschForm)?.id ?? PDF_VORLAGEN[0].id) : PDF_VORLAGEN[0].id,
  );
  /** Welche Vorlage gerade gross zu sehen ist — leer heisst: keine. */
  const [gross, setGross] = useState("");

  /**
   * DIE DEUTSCHE VORLAGE STEHT VORN (Owner 31.08.2026: „wenn das ein Template für sich ist,
   * dann mach das als erstes rein") — aber NUR HIER, nicht in `PDF_VORLAGEN` selbst.
   *
   * Die Liste umzusortieren wäre der naheliegende Weg und der falsche: `PDF_VORLAGEN[0]` ist
   * im ganzen Haus die Vorgabe — Davids Angebot startet damit, und `vorlageFinden` fällt
   * darauf zurück, wenn eine Kennung unbekannt ist. Ein Profil ohne gespeicherte Vorlage
   * würde also plötzlich als „Deutsch" gezeichnet, auch ein längst bezahltes. Die Reihenfolge
   * gehört in die Anzeige, nicht in die Datenquelle.
   */
  const vorlagen = [...PDF_VORLAGEN].sort((a, b) => Number(!!b.deutschForm) - Number(!!a.deutschForm));
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState("");
  const [fehler, setFehler] = useState("");

  const [kurz, setKurz] = useState<Kurz | null>(null);
  const [fehlend, setFehlend] = useState<string[]>([]);
  const [hatFoto, setHatFoto] = useState(false);
  const [antwort, setAntwort] = useState("");
  const [bezahlt, setBezahlt] = useState(false);
  /** Die Foto-Frage kommt EINMAL — danach nie wieder, egal wie er geantwortet hat. */
  const [fotoGefragt, setFotoGefragt] = useState(false);

  const cvRef = useRef<HTMLInputElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const nachRef = useRef<HTMLInputElement>(null);
  const kasse = useKasseImFenster(phase);

  const geraeteKennung = () => { try { return localStorage.getItem("lb_visitor") ?? ""; } catch { return ""; } };

  /**
   * DER TRICHTER MERKT SICH, WO DU WARST (Owner 31.08.2026: „ich will nicht tausend mal mein
   * PDF umwandeln um zum letzten Screen zu kommen").
   *
   * Er hat es beim Prüfen gesagt, aber es gilt für jeden Kunden: Wer die Seite neu lädt, das
   * Handy sperrt oder von der Kasse zurückkommt, hatte bisher alles verloren — und jeder neue
   * Anlauf ist ein weiterer bezahlter Modell-Aufruf. Gespeichert wird nur, was zum
   * Wiederfinden nötig ist: die Auftragskennung, die Vorlage und wie weit er war. Der
   * Lebenslauf selbst liegt ohnehin auf dem Server.
   */
  const ABLAGE = "lb_cvgen_stand";

  /* Zuerst nachsehen, ob hier schon einer gearbeitet hat. */
  useEffect(() => {
    try {
      const roh = localStorage.getItem(ABLAGE);
      if (!roh) return;
      const d = JSON.parse(roh) as { genId?: string; vorlage?: string; phase?: Phase; bezahlt?: boolean };
      if (!d?.genId) return;
      setGenId(d.genId);
      /* AUCH BEIM WIEDERSEHEN (31.08.2026): Wer sein Dokument vor dieser Reparatur gebaut
         hat, hat kein Ticket — sein Browser holt es sich hier nach, sobald er die Seite
         wieder öffnet. Sonst bliebe genau der bezahlte Auftrag in der Galerie gesperrt. */
      void besitzHinterlegen(d.genId);
      if (d.vorlage && PDF_VORLAGEN.some(v => v.id === d.vorlage)) setVorlage(d.vorlage);
      if (d.bezahlt) setBezahlt(true);
      /* Zurück auf die FERTIG-Stufe, nicht mitten in den Chat: Dort steht sein Ergebnis,
         und nur dorthin will jemand zurück. */
      if (d.phase === "fertig") setPhase("fertig");
    } catch { /* kein Stand ist auch ein Stand */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Und den Stand fortschreiben, sobald es etwas zu merken gibt. */
  useEffect(() => {
    if (!genId) return;
    try { localStorage.setItem(ABLAGE, JSON.stringify({ genId, vorlage, phase, bezahlt })); } catch { /**/ }
  }, [genId, vorlage, phase, bezahlt]);

  /**
   * KEIN AUFTRAG BEIM BLOSSEN ÖFFNEN (31.08.2026, nachgemessen: 23 Aufträge im Speicher,
   * genau EINER mit Inhalt).
   *
   * Vorher legte die Seite die Kennung an, sobald sie stand — jeder Blick auf die Seite
   * hinterliess damit einen leeren Auftrag im Log. Das ist nicht nur Müll: Es macht jede
   * spätere Zählung wertlos, weil „Aufträge" dann Seitenaufrufe heisst. Die Kennung
   * entsteht jetzt ausschliesslich in `auftragSichern()` — beim Einlesen und beim Kauf,
   * also da, wo wirklich etwas passiert.
   */

  /**
   * DIE AUFTRAGSKENNUNG — NOTFALLS JETZT (Owner 31.08.2026: „der Kauf geht nicht").
   *
   * Der Auftrag entsteht beim Laden der Seite. Schlägt das fehl — Netz weg, Speicher kurz
   * nicht erreichbar —, blieb `genId` leer, und der Kaufknopf kehrte WORTLOS um
   * (`if (!genId) return`). Man drückt, nichts passiert: der schlimmste Fehler von allen,
   * weil er wie ein kaputtes Produkt aussieht und nichts zum Anfassen hinterlässt.
   *
   * Jetzt wird die Kennung dort besorgt, wo sie gebraucht wird, und wenn das auch scheitert,
   * steht eine sichtbare Absage am Knopf (Hausregel „Sichtbare Fehler, keine stummen").
   */
  const auftragSichern = async (): Promise<string> => {
    if (genId) return genId;
    try {
      const log = await fetch("/api/kiss-log", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: "resume", device: geraeteKennung() }),
      }).then(r => r.json());
      if (log?.id) { setGenId(String(log.id)); return String(log.id); }
    } catch { /* die Absage macht der Aufrufer sichtbar */ }
    return "";
  };

  /**
   * DEN BESITZ EINMAL AM SERVER HINTERLEGEN (Owner 31.08.2026: „unter Assets kommt eine
   * Fehlermeldung wenn ich Bewerbung klicke").
   *
   * Die Galerie öffnet das PDF ohne Geräte-Kennung in der Adresse — bewusst, seit dem
   * 28.08.: Wer den Link weiterleitet, soll die Bewerbung nicht mitliefern. Der Server
   * erkennt den Besitzer dort am signierten Keks, und den stellt `/api/lebenslauf-besitz`
   * aus. Der Generator hat ihn nie angefordert; in der Galerie stand deshalb „Diese
   * Bewerbung gehört zu einem anderen Browser" — auf seinem eigenen Gerät, an seinem
   * eigenen, bezahlten Dokument.
   *
   * Ein stiller Handgriff ohne Kosten: kein Modell, keine Kasse, nur ein Ticket.
   */
  const besitzHinterlegen = async (auftrag: string) => {
    if (!auftrag) return;
    try {
      await fetch("/api/lebenslauf-besitz", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: auftrag, device: geraeteKennung() }),
      });
    } catch { /* ohne Ticket bleibt der Weg über die Geräte-Kennung */ }
  };

  const ladeHoch = async (f: File): Promise<string> => {
    const ext = (f.name.split(".").pop() || "bin").toLowerCase();
    const signiert = await fetch("/api/lebenslauf-video-url", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extension: ext }),
    }).then(r => r.json());
    if (!signiert?.uploadUrl || !signiert?.path) throw new Error("upload-url");
    const put = await fetch(signiert.uploadUrl, {
      method: "PUT", headers: { "Content-Type": f.type || "application/octet-stream", "x-upsert": "true" }, body: f,
    });
    if (!put.ok) throw new Error("upload-put");
    return signiert.path;
  };

  /** Bild verkleinern, bevor es die Leitung sieht — dieselbe Mechanik wie im Bestand. */
  const bildLesen = async (f: File): Promise<string> => {
    const url = URL.createObjectURL(f);
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const faktor = Math.min(1, 1024 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * faktor);
    c.height = Math.round(img.height * faktor);
    c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    return c.toDataURL("image/jpeg", 0.85);
  };

  const einlesen = async () => {
    if (busy) return;
    if (!cvPath) { setFehler(S.fehlerCv); return; }
    setBusy(true); setBusyText(S.laufText); setFehler("");
    void logFunnelEvent("cvgen_started", { theme: "resume" });
    const auftrag = await auftragSichern();
    if (!auftrag) { setFehler(S.fehlerNetz); setBusy(false); setBusyText(""); return; }
    try {
      const d = await fetch("/api/resume-generator", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schritt: "kreator", id: auftrag, device: geraeteKennung(), cvPath, cvName, vorlage, ...(foto ? { foto } : {}), ...(zielsprache ? { zielsprache } : {}) }),
      }).then(r => r.json());
      if (d?.error) { setFehler(String(d.error)); setBusy(false); setBusyText(""); return; }
      void besitzHinterlegen(auftrag);   // ab jetzt gibt es ein Profil — das Ticket gilt
      setKurz(d.profil ?? null);
      setFehlend(Array.isArray(d.fehlend) ? d.fehlend : []);
      setHatFoto(!!d.hatFoto);
      setPhase("chat");
      void logFunnelEvent("cvgen_read", { theme: "resume" });
    } catch { setFehler(S.fehlerNetz); }
    setBusy(false); setBusyText("");
  };

  /** Eine Antwort des Minichats — ohne Modell, direkt ins Profil. */
  const ergaenzen = async (teil: Record<string, unknown>) => {
    setFehler("");
    try {
      const d = await fetch("/api/resume-generator", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schritt: "ergaenzen", id: genId, device: geraeteKennung(), ...teil }),
      }).then(r => r.json());
      if (d?.error) { setFehler(String(d.error)); return false; }
      setKurz(d.profil ?? kurz);
      setFehlend(Array.isArray(d.fehlend) ? d.fehlend : []);
      setHatFoto(!!d.hatFoto);
      return true;
    } catch { setFehler(S.fehlerNetz); return false; }
  };

  /**
   * FREISCHALTEN — UND ES DARF NICHT AM WETTLAUF SCHEITERN (Owner 31.08.2026: „ich habe es
   * gekauft aber kam mit Wasserzeichen wieder").
   *
   * Die Route lässt nur durch, wenn der AUFTRAG als bezahlt gestempelt ist. Diesen Stempel
   * setzt Stripe über den Webhook — der kommt Sekunden nach der Rückkehr des Kunden. Wer
   * einmal fragt und dann aufgibt, fragt genau in dieser Lücke: 402 „Erst nach der Zahlung",
   * Wasserzeichen bleibt, und der Kunde hat bezahlt und nichts bekommen. Genau das ist
   * passiert — das Profil stand Minuten später auf bezahlt, sein PDF war da längst geladen.
   *
   * Deshalb: mehrmals fragen, mit Pause. Und `auftrag` als Argument, weil der Zustand direkt
   * nach der Rückkehr noch nicht im React-Zustand steht.
   */
  const freischalten = async (auftrag?: string) => {
    const nr = auftrag || genId;
    if (!nr) return;
    for (let versuch = 0; versuch < 6; versuch++) {
      try {
        const d = await fetch("/api/resume-generator", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schritt: "freischalten", id: nr, device: geraeteKennung() }),
        }).then(r => r.json());
        if (d?.ok) {
          setBezahlt(true); setFehler("");
          void logFunnelEvent("cvgen_unlocked", { theme: "resume" });
          return;
        }
        /* Nur der Zahlungs-Riegel ist einen zweiten Versuch wert — alles andere bleibt stehen. */
        if (!d?.zahlungNoetig) { setFehler(String(d?.error ?? S.fehlerNetz)); return; }
      } catch { /* Netz zuckt — der nächste Versuch kommt gleich */ }
      await new Promise(r => setTimeout(r, 2500));
    }
    setFehler(S.fehlerNetz);
  };

  /* Der Kaufweg — dasselbe Tür-1-Muster wie überall im Haus. */
  const kaufen = async () => {
    if (busy) return;
    setFehler("");
    const auftrag = await auftragSichern();
    if (!auftrag) { setFehler(S.fehlerNetz); return; }
    const popup = kassenFenster();
    try {
      const start = await fetch("/api/kiss-video-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genId: auftrag, once: true, videoAufpreis: false, thema: "resume",
          ...(kurz?.email ? { email: kurz.email } : {}),
          returnTo: window.location.pathname, eingebettet: kasse.anfordern, lang,
        }),
      }).then(r => r.json());
      if (start?.walletPaid) { try { popup?.close(); } catch { /**/ } void freischalten(); return; }
      if ((!start?.url && !start?.clientSecret) || !start?.sessionId) {
        try { popup?.close(); } catch { /**/ }
        setFehler(start?.error || S.fehlerNetz);
        return;
      }
      if (kasse.uebernehmen(start.clientSecret)) return;
      if (kasseOeffnen(popup, start.url) !== "popup" || !popup) return;
      for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const z = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(start.sessionId)}`).then(r => r.json()).catch(() => null);
        if (z?.paid) { try { popup.close(); } catch { /**/ } void freischalten(); return; }
        if (popup.closed && i > 2) break;
      }
      try { popup.close(); } catch { /**/ }
    } catch {
      try { popup?.close(); } catch { /**/ }
      setFehler(S.fehlerNetz);
    }
  };

  /**
   * DIE RÜCKKEHR VON DER KASSE — GENAU DAS HAUS-MUSTER (31.08.2026).
   *
   * Stripe schickt die Seite auf `?paid=1&cs=<Sitzung>` zurück. Der entscheidende Schritt
   * dazwischen fehlte hier: `/api/checkout-status` fragt die Sitzung bei Stripe ab UND
   * stempelt den Auftrag als bezahlt (`bezahltVermerken`) — ohne diesen Aufruf wartet man
   * auf den Webhook und bekommt in der Zwischenzeit ein Wasserzeichen. Jeder andere Trichter
   * im Haus macht es so (LebenslaufStartClient, KissFunnel, TryFunnel).
   *
   * Danach kommen die Parameter aus der Adresse — ein Neuladen soll den Kauf nicht ein
   * zweites Mal auslösen.
   */
  const rueckkehr = useRef(false);
  useEffect(() => {
    if (!genId || rueckkehr.current) return;
    let q: URLSearchParams;
    try { q = new URLSearchParams(window.location.search); } catch { return; }
    if (q.get("paid") !== "1") return;
    rueckkehr.current = true;
    const cs = q.get("cs") ?? "";
    void (async () => {
      if (cs && !cs.startsWith("{")) {
        await fetch(`/api/checkout-status?session_id=${encodeURIComponent(cs)}`).catch(() => null);
      }
      q.delete("paid"); q.delete("cs");
      const rest = q.toString();
      try { window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : "")); } catch { /**/ }
      await freischalten(genId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genId]);

  const pdfUrl = genId
    ? `/api/bewerbung-pdf?id=${encodeURIComponent(genId)}&device=${encodeURIComponent(geraeteKennung())}&vorlage=${encodeURIComponent(vorlage)}`
    : "";
  /**
   * `min-w-0` IST HIER DER GANZE PUNKT (Owner 31.08.2026, mit Bild: „text geht raus aus der
   * box").
   *
   * Ein Dateiname wie `CV_Geza_Lakatos_RO_2026.docx` hat keine Leerzeichen — der Browser
   * findet keine Stelle zum Umbrechen und schiebt ihn stattdessen über den Rand hinaus. In
   * einem Raster ist die Vorgabe ausserdem `min-width: auto`: Die Kachel wächst mit ihrem
   * Inhalt, statt ihn zu beschneiden. Erst `min-w-0` erlaubt ihr, schmaler als ihr Text zu
   * sein — und dann greift `truncate` an der Beschriftung darin.
   */
  const kachel = (voll: boolean) =>
    `flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-3 py-5 text-center transition active:scale-[0.98] ${voll ? "border-[#f6cf51]/60 lb-goldhauch" : "border-white/25"}`;

  /* ── 1 · Die Vorlage ── */
  if (phase === "vorlage") {
    return (
      <div className="flex flex-col gap-4">
        <Kasten polster="p-4">
          <p className="text-[15px] font-black leading-snug text-white">{S.vorlageTitel}</p>
          <p className="mt-1 text-[13px] font-medium text-white/60">{S.vorlageHinweis}</p>

          {/**
            * EIN RASTER, KEINE WISCH-REIHE (Owner 31.08.2026, mit Bild: „du schneidest hier
            * die Linie ab").
            *
            * Eine waagerechte Reihe schneidet die letzte Kachel am Rand ab — das ist als
            * Hinweis aufs Wischen gedacht, sieht bei fünf Blättern aber nach Fehler aus. Im
            * Dreier-Raster stehen alle vollständig da, nichts wird angeschnitten.
            *
            * `object-contain` statt `object-cover`: Die Bilder haben zwar exakt A4-Verhältnis,
            * aber die Vorlagen tragen Linien BIS an den Rand — beim kleinsten Rundungsfehler
            * verschwindet genau die Linie, die den Unterschied ausmacht.
            */}
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {vorlagen.map(v => (
              <div key={v.id} className="min-w-0">
                <div className="relative">
                  <button type="button" onClick={() => setVorlage(v.id)} className="block w-full">
                    {/* Gewählt wechselt die FARBE des Rings, nie die Grösse — beide Zustände
                        tragen `ring-2 ring-offset-2` (Hausregel „Auswahl verschiebt NIE"). */}
                    <span className={`block overflow-hidden rounded-lg bg-white/5 ring-2 ring-offset-2 ring-offset-transparent transition ${
                      vorlage === v.id ? "ring-[#f6cf51]" : "ring-white/15"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={vorlagenBild(v.id)} alt="" className="block aspect-[1/1.414] w-full object-contain" />
                    </span>
                  </button>
                  {/* Vergrössern — dieselbe Scheibe und dieselbe Überlagerung wie in Davids
                      Vorlagen-Galerie, damit es sich überall gleich anfühlt. */}
                  <div className="absolute right-1 top-1 z-10">
                    <Scheibe klein durchsichtig label={v.name} onClick={() => setGross(v.id)}>
                      <Maximize2 className="h-3.5 w-3.5" />
                    </Scheibe>
                  </div>
                </div>
                <span className={`mt-1.5 block truncate text-center text-[11.5px] font-black ${
                  vorlage === v.id ? "text-[#f6cf51]" : "text-white/60"}`}>{v.name}</span>
              </div>
            ))}
          </div>
        </Kasten>

        <Knopf art="gold" onClick={() => setPhase("eingabe")}>
          <span className="inline-flex items-center gap-2">
            {zielsprache === "de" && <FlaggeDe className="h-3.5 w-5" />}{S.vorlageWeiter}
          </span>
        </Knopf>

        {gross && (
          <BlattUeberlagerung
            bildUrl={vorlagenBild(gross)}
            beschriftung={PDF_VORLAGEN.find(v => v.id === gross)?.name}
            zu={() => setGross("")} />
        )}
      </div>
    );
  }

  /* ── 2 · Hochladen ── */
  if (phase === "eingabe") {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => cvRef.current?.click()} className={kachel(!!cvPath)}>
            <FileText className="h-6 w-6 text-[#f6cf51]" />
            <span className="w-full truncate text-[13px] font-black text-white/90" title={cvName || undefined}>
              {cvName || S.cvTitel}
            </span>
            <span className="text-[11.5px] font-bold text-white/50">{S.cvHinweis}</span>
          </button>
          <button type="button" onClick={() => fotoRef.current?.click()} className={kachel(!!foto)}>
            <ImagePlus className="h-6 w-6 text-[#f6cf51]" />
            <span className="w-full truncate text-[13px] font-black text-white/90">{S.fotoTitel}</span>
            <span className="text-[11.5px] font-bold text-white/50">{S.fotoHinweis}</span>
          </button>
        </div>

        <Fehlerzeile>{fehler}</Fehlerzeile>
        {busy ? <Fortschritt text={busyText} /> : (
          <Knopf art="gold" onClick={() => void einlesen()}>
            {/* Die Flagge sagt, in welcher Sprache das Dokument herauskommt — Information,
                kein Schmuck (siehe `FlaggeDe` in der Bibliothek). */}
            <span className="inline-flex items-center gap-2">
              {zielsprache === "de" && <FlaggeDe className="h-3.5 w-5" />}{S.starten}
            </span>
          </Knopf>
        )}
        <p className="text-center text-[12px] font-bold text-white/55">{S.gratisZeile}</p>

        <input ref={cvRef} type="file" className="hidden"
          accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={async e => {
            const f = e.target.files?.[0]; e.target.value = "";
            if (!f) return;
            setFehler("");
            try { setCvPath(await ladeHoch(f)); setCvName(f.name); } catch { setFehler(S.fehlerNetz); }
          }} />
        <input ref={fotoRef} type="file" accept="image/*,.heic,.heif" className="hidden"
          onChange={async e => {
            const f = e.target.files?.[0]; e.target.value = "";
            if (!f) return;
            try { setFoto(await bildLesen(f)); } catch { setFehler(S.fehlerNetz); }
          }} />
      </div>
    );
  }

  /* ── 2 · Der Minichat ── */
  if (phase === "chat") {
    const offen = fehlend[0];
    /* Die Foto-Frage kommt NACH den Feldern und nur einmal (Owner: „bewusst nicht
       hochgeladen oder vergessen"). */
    const fotoFrageDran = !offen && !hatFoto && !kurz?.ohneFoto && !fotoGefragt;
    const allesDa = !offen && !fotoFrageDran;

    return (
      <div className="flex flex-col gap-3">
        <Kasten polster="p-5">
          <p className="text-[15px] font-black leading-snug text-white">{S.chatGelesen}</p>
          {kurz && (
            <p className="mt-1.5 text-[13.5px] font-medium leading-snug text-white/70">
              {S.chatGefunden
                .replace("{stationen}", String(kurz.stationen))
                .replace("{ausbildung}", String(kurz.ausbildung))
                .replace("{sprachen}", String(kurz.sprachen))}
            </p>
          )}

          {offen && (
            <>
              <p className="mt-4 text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">{S.chatFehlt}</p>
              <p className="mt-1 text-[15px] font-black leading-snug text-white">{(FRAGE[offen] && S[FRAGE[offen]]) || offen}</p>
              <Eingabe className="mt-2.5" value={antwort} autoFocus
                type={offen === "email" ? "email" : "text"}
                inputMode={offen === "telefon" ? "tel" : offen === "email" ? "email" : "text"}
                onChange={e => { setAntwort(e.target.value); setFehler(""); }} />
              <Fehlerzeile>{fehler}</Fehlerzeile>
              <div className="mt-3 flex gap-2">
                <Knopf art="gold" onClick={async () => {
                  if (!antwort.trim()) return;
                  if (await ergaenzen({ feld: offen, wert: antwort.trim() })) setAntwort("");
                }}>{S.chatWeiter}</Knopf>
              </div>
              {/* Nicht jeder hat alles — wer keine Nummer angeben will, kommt trotzdem weiter. */}
              <button type="button"
                onClick={() => { setAntwort(""); setFehlend(f => f.slice(1)); }}
                className="mt-3 text-[12.5px] font-bold text-white/45 underline underline-offset-2">
                {S.chatUeberspringen}
              </button>
            </>
          )}

          {fotoFrageDran && (
            <>
              <p className="mt-4 text-[15px] font-black leading-snug text-white">{S.fotoFrage}</p>
              <div className="mt-3 flex flex-col gap-2">
                <Knopf art="umriss" onClick={() => { setFotoGefragt(true); void ergaenzen({ ohneFoto: true }); }}>
                  {S.fotoAbsicht}
                </Knopf>
                <Knopf art="gold" onClick={() => nachRef.current?.click()}>{S.fotoNachreichen}</Knopf>
              </div>
              <Fehlerzeile>{fehler}</Fehlerzeile>
            </>
          )}

          {allesDa && (
            <>
              <p className="mt-4 text-[15px] font-black leading-snug text-white">{S.fertigFrage}</p>
              <div className="mt-3">
                <Knopf art="gold" onClick={() => { setPhase("fertig"); void logFunnelEvent("cvgen_ready", { theme: "resume" }); }}>
                  {S.fertigJa}
                </Knopf>
              </div>
            </>
          )}
        </Kasten>

        <input ref={nachRef} type="file" accept="image/*,.heic,.heif" className="hidden"
          onChange={async e => {
            const f = e.target.files?.[0]; e.target.value = "";
            if (!f) return;
            setFotoGefragt(true);
            try { await ergaenzen({ foto: await bildLesen(f) }); } catch { setFehler(S.fehlerNetz); }
          }} />
      </div>
    );
  }

  /* ── 3 · Vorschau und Kauf ── */
  return (
    <div className="flex flex-col gap-3">
      <Kasten polster="p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">
          {bezahlt ? S.fertigTitel : S.vorschauTitel}
        </p>

        {/**
          * DIE VORSCHAU — EINGEBETTET AM RECHNER, ALS KARTE AUF DEM HANDY.
          *
          * Ein `<iframe>` mit PDF zeigt auf iOS und manchen Android-Browsern nur einen
          * Download-Balken oder bleibt leer — ausgerechnet dort, wo der Anzeigen-Verkehr
          * ankommt. Das ANZEIGEN eines PDFs können sie alle, nur nicht das Einbetten.
          * Deshalb: eingebettet ab `sm`, darunter ein Knopf, der es im eigenen Betrachter
          * öffnet. Kostet keine zusätzliche Bibliothek.
          */}
        <div className="mt-3 hidden overflow-hidden rounded-xl border border-white/15 bg-white/[0.04] sm:block">
          <iframe src={pdfUrl} title={S.vorschauTitel} className="h-[520px] w-full" />
        </div>
        <div className="mt-3 sm:hidden">
          <Knopf art="umriss" href={pdfUrl}>{S.vorschauTitel}</Knopf>
        </div>

        {!bezahlt && <p className="mt-2 text-center text-[11.5px] font-medium text-white/45">{S.vorschauHinweis}</p>}

        <div className="mt-3">
          <a href={pdfUrl} download
            onClick={() => void logFunnelEvent("cvgen_pdf_downloaded", { theme: "resume", bezahlt: String(bezahlt) })}
            className="lb-gold flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-black">
            <Download className="h-4 w-4" /> {bezahlt ? S.pdfKnopfVoll : S.pdfKnopf}
          </a>
        </div>
      </Kasten>

      {/**
        * DIE KASSE MUSS AUCH IN DER SEITE STEHEN (Owner 31.08.2026: „jetzt kann ich kaufen
        * oder nicht?" — und davor zweimal „der Kauf geht nicht").
        *
        * `kaufen()` holte die Sitzung, rief `kasse.uebernehmen(clientSecret)` und war fertig
        * — nur hing das Formular nirgends im Baum. Für den Kunden hiess das: Er drückt, im
        * Hintergrund entsteht eine echte Kassensitzung, und auf dem Bildschirm passiert
        * NICHTS. Der Haken liefert das Formular als `block`; wer ihn benutzt, muss ihn auch
        * rendern (so machen es TryFunnel und der Prüfstand seit dem 15.08.).
        *
        * Solange die Kasse steht, verschwindet der Kaufknopf — zwei Kaufwege auf einem
        * Bildschirm erzeugen sonst eine zweite Sitzung über der ersten.
        */}
      {kasse.block}

      {!bezahlt && !kasse.block && (
        <Kasten art="gold" polster="p-5">
          <p className="text-[16px] font-black leading-snug text-white">{S.kaufTitel}</p>
          <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-white/80">{S.kaufText}</p>
          <Fehlerzeile>{fehler}</Fehlerzeile>
          <div className="mt-3">
            <Knopf art="gold" onClick={() => void kaufen()}>{`${preisText} · ${S.kaufKnopf}`}</Knopf>
          </div>
        </Kasten>
      )}

      {/* Von vorn — sonst käme er nie wieder aus seinem eigenen Ergebnis heraus. */}
      <button type="button"
        onClick={() => { try { localStorage.removeItem(ABLAGE); } catch { /**/ }
          setGenId(""); setPhase("vorlage"); setKurz(null); setFehlend([]); setHatFoto(false);
          setBezahlt(false); setFotoGefragt(false); setCvPath(""); setCvName(""); setFoto(""); }}
        className="mx-auto text-[12.5px] font-bold text-white/45 underline underline-offset-2">
        {S.nochmal}
      </button>

      {bezahlt && (
        <p className="flex items-center justify-center gap-2 text-[13.5px] font-black text-white/85">
          <Check className="h-4 w-4 text-[#f6cf51]" />{S.fertigTitel}
        </p>
      )}
    </div>
  );
}
