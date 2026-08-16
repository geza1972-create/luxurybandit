"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, Users } from "lucide-react";

/**
 * WER HAT WAS HOCHGELADEN — und was kam heraus.
 *
 * Owner 30.07.2026: „ich will eine Galerie haben als Tab neben Besucher mit allen Bildern die
 * hochgeladen werden, Models, eigene … von wem das ist, E-Mail, Uhrzeit und erzeugtes Bild."
 * Dazu: „du nennst es so, dass wir diesen Tab überall einbauen können, auch bei Kiss."
 *
 * Deshalb ein eigener Baustein und keine Erweiterung einer Seite: `<UploadsAdmin />` lässt
 * sich unter jedes Thema hängen, ohne etwas zu kopieren.
 *
 * Drei Spalten je Zeile, immer in derselben Reihenfolge:
 *   SIE (was er hochgeladen oder gewählt hat) · ER · das Ergebnis
 * Fehlt eine, blieb der Besuch dort stehen — und genau das ist die interessante Auskunft:
 * wer angefangen und aufgegeben hat.
 *
 * Blendet sich ohne Admin-PIN selbst aus.
 */

type Eintrag = {
  id: string; createdAt: string; modelName?: string; email?: string; device?: string;
  /** Welches Produkt — nur in der Gesamtliste sichtbar, dort mischen sich alle Themen. */
  theme?: string;
  /** Wie bezahlt wurde: „once“ Einzelkauf, „abo“, leer bei Alt-Eintraegen. */
  paidKind?: string;
  /** Was wirklich gezahlt wurde, in Cent. Fehlt bei allen Kaeufen vor dem 14.08.2026. */
  paidCents?: number;
  paid?: boolean; videoUrl?: string; imageUrl?: string; personUrl?: string; modelUrl?: string;
  listen?: string[];   // in welchen Abonnentenlisten er schon steht
  // Bezahlt, aber noch kein Video: was der Server damit gerade macht.
  videoDueAt?: string; videoId?: string; videoTries?: number; videoError?: string; videoMailedAt?: string;
  /** Wann der Server den Lauf gestartet hat — Basis der Dauer-Marke. */
  videoStartAt?: string;
  /** Wann die Programm-/Ergebnis-Mail rausging (kiss-delivery setzt ihn NACH dem Versand). */
  programmMailAt?: string;
  videoDoneId?: string;   // welcher Auftrag schon geliefert ist (Abo: mehrere je Eintrag)
  /**
   * WAS DIE EINGANGSPRUEFUNG ERKANNT HAT (Owner 03.08.2026: „ich will aber als Admin den
   * Verlauf sehen beim Uploadbilder"). Steht nur da, wenn etwas auffiel — der abgewiesene
   * Upload liegt trotzdem hier, sonst waere der Verlauf lueckenhaft.
   */
  altersWarnung?: string;
  altersGeschaetzt?: number;
  /**
   * SEIN WEG (Owner 16.08.2026: „ich muss bei jedem user sehen den pfad den er geht. Auch
   * wenn er auf einer anderen topic wechselt, bis er aussteigt" — mit Bild DIESER Karte:
   * „also hier"). Kommt fertig sortiert vom Server (/api/kiss-log), aelteste Station zuerst.
   */
  weg?: { t: string; thema: string; name: string; step?: string; vorlage?: string; quelle?: string }[];
};

/**
 * DIE STATIONEN IN KLARTEXT — ein Weg soll sich LESEN lassen.
 *
 * `funnel_started` und `step_completed` sind Namen aus dem Protokoll; wer die Karte
 * anschaut, will „Trichter offen" und „Schritt 2" sehen. Unbekannte Namen bleiben stehen wie
 * sie sind (neue Ereignisse sollen nicht unsichtbar werden, nur weil hier eine Zeile fehlt).
 */
const STATION: Record<string, string> = {
  funnel_started: "Trichter offen",
  step_completed: "Schritt",
  look_selected: "Vorlage",
  lead_created: "E-Mail",
  email: "E-Mail",
  generate_tap: "Knopf",
  generate: "erzeugt",
  checkout_started: "Kasse",
  payment_completed: "BEZAHLT",
  tryon: "Try-on",
};

/** Klartext fuers Warnzeichen — „nacktheit" allein liest sich wie ein Datenbankfeld. */
const WARN_TEXT: Record<string, string> = {
  nacktheit: "Nacktheit — abgewiesen",
  "kind-nackt": "KIND + NACKTHEIT",
  minderjaehrig: "wirkt minderjährig",
  unklar: "Prüfung unklar",
};

export default function UploadsAdmin({ title = "Hochgeladen & erzeugt", theme = "kiss", suche = "" }: {
  title?: string;
  /**
   * WELCHES THEMA (Owner 31.07.2026: „was suchen die von kiss bei idol?").
   *
   * Der Log ist einer für alle Themen — ohne diese Angabe zeigte jede Themenseite die
   * Besucher aller anderen mit. Alte Einträge ohne Kennzeichen gelten als „kiss".
   */
  theme?: string;
  /**
   * SUCHE VON AUSSEN (Owner 14.08.2026: „warum finde ich adrian nicht").
   *
   * Das Feld oben im Admin gehoerte der A-Liste; diese Liste zeigte stur alle 121 Eintraege.
   * Statt ein zweites Suchfeld danebenzustellen, reicht der Admin seinen Begriff herein —
   * gesucht wird in E-Mail, Produkt, Modellname und Auftragsnummer.
   */
  suche?: string;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [rows, setRows] = useState<Eintrag[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [arm, setArm] = useState("");        // erster Tipp auf den Papierkorb
  // GRÜNER PUNKT BEI NEUEM (Owner 30.07.2026: „will einen grünen Punkt sehen wenn neue Sachen
  // drin liegen"). „Neu" heisst: seit dem letzten Blick dazugekommen. Der Zeitpunkt liegt im
  // Gerät, nicht auf dem Server — es geht um SEINEN letzten Blick, nicht um den von irgendwem.
  const [neu, setNeu] = useState(0);
  /**
   * WAS LIEGT IN SEINER GALERIE? (Owner 14.08.2026: „ich will wissen was er gekauft hat und
   * was er bekommen hat … ob er das generierte Video in der Galerie hat").
   *
   * Der Auftrag sagt, was bestellt und bezahlt wurde. Ob beim Kunden auch etwas ANKAM, stand
   * bisher nirgends — das beantwortete nur ein Skript gegen die Datenbank. Der Knopf fragt
   * `/api/my-videos` mit dem Admin-PIN nach SEINER Adresse; die Route laesst das seit heute
   * ausdruecklich zu (fuer alle ohne PIN bleibt sie zu).
   */
  /**
   * VOLLBILD MIT GARANTIERTEM AUSWEG (Owner 14.08.2026, mit Bild: „ich kann das nicht
   * schliessen"). Die Kacheln oeffneten die ROHE Speicher-Adresse in einem neuen Tab —
   * auf dem Handy ein Fenster ohne erkennbaren Rueckweg. Hausregel „Immer close einbauen":
   * jede Vollbild-Flaeche braucht ein Kreuz und schliesst auch per Tipp daneben. Also eine
   * Schicht IM Admin statt eines fremden Tabs.
   */
  const [gross, setGross] = useState<{ url: string; video?: boolean } | null>(null);
  const [galerie, setGalerie] = useState<Record<string, "laden" | { url: string; poster?: string; createdAt?: string }[]>>({});

  const galerieHolen = async (mail: string) => {
    if (!mail || galerie[mail]) return;
    setGalerie(g => ({ ...g, [mail]: "laden" }));
    try {
      const r = await fetch(`/api/my-videos?email=${encodeURIComponent(mail)}`,
        { headers: { "x-try-look-admin-pin": pin }, cache: "no-store" }).then(x => x.json());
      setGalerie(g => ({ ...g, [mail]: Array.isArray(r?.videos) ? r.videos : [] }));
    } catch { setGalerie(g => ({ ...g, [mail]: [] })); }
  };

  useEffect(() => {
    let p = "";
    try { p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { /**/ }
    setPin(p); setIsAdmin(!!p);
    if (!p) { setLoading(false); return; }
    fetch(`/api/kiss-log?theme=${encodeURIComponent(theme)}`, { headers: { "x-try-look-admin-pin": p }, cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        const liste: Eintrag[] = Array.isArray(d?.entries) ? d.entries : [];
        setRows(liste);
        try {
          const zuletzt = Number(localStorage.getItem("lb_uploads_gesehen") ?? 0);
          setNeu(liste.filter(e => new Date(e.createdAt).getTime() > zuletzt).length);
          // Sofort als gesehen vermerken: er schaut ja gerade hin. Beim nächsten Mal zählt
          // dann nur, was seitdem dazukam.
          localStorage.setItem("lb_uploads_gesehen", String(Date.now()));
        } catch { /**/ }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const suchWort = suche.trim().toLowerCase();
  const sichtbar = suchWort
    ? rows.filter(e => [e.email, e.theme, e.modelName, e.id, e.device]
        .some(v => String(v ?? "").toLowerCase().includes(suchWort)))
    : rows;

  const entfernen = async (id: string) => {
    // Zwei Tipps statt window.confirm — der Dialog erscheint auf dem Handy nicht.
    if (arm !== id) { setArm(id); setTimeout(() => setArm(a => (a === id ? "" : a)), 4000); return; }
    setArm(""); setBusy(id);
    const vorher = rows;
    setRows(r => r.filter(x => x.id !== id));
    try {
      const r = await fetch("/api/kiss-log", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-try-look-admin-pin": pin },
        body: JSON.stringify({ remove: id }),
      });
      if (!r.ok) setRows(vorher);
    } catch { setRows(vorher); }
    finally { setBusy(""); }
  };

  if (!isAdmin) return null;

  const zeit = (s: string) => {
    try {
      return new Date(s).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  // WER STEHT AUF DEM BILD (Owner 30.07.2026: „selbst dann muss ich sehen wen er ausgewählt
  // hat"). Der Name steht unter der Kachel „Sie" — bei einer Katalog-Frau ihrer, bei einem
  // eigenen Upload „Your model". Ohne Namen ist ein Foto keine Auskunft.
  const Kachel = ({ url, label, name }: { url?: string; label: string; name?: string }) => (
    <div className="min-w-0 flex-1">
      <p className="mb-1 truncate text-[9px] font-black uppercase tracking-wide text-black/40">
        {label}{name ? ` · ${name}` : ""}
      </p>
      {url ? (
        <button type="button" onClick={() => setGross({ url })} className="block w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="aspect-[2/3] w-full rounded-lg border border-black/10 object-cover" />
        </button>
      ) : (
        <div className="grid aspect-[2/3] w-full place-items-center rounded-lg border border-dashed border-black/15 bg-black/[0.03] text-[10px] font-bold text-black/30">
          —
        </div>
      )}
    </div>
  );

  return (
    <div className="rounded-2xl border border-white/15 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/50">Nur für dich sichtbar</p>
      <h2 className="mt-1 flex items-center gap-2 text-[18px] font-black text-black">
        <Users className="h-4 w-4 text-black/50" /> {title} <span className="text-black/40">({rows.length})</span>
        {neu > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-black text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> {neu} neu
          </span>
        )}
      </h2>
      <p className="mt-0.5 text-[12px] font-semibold text-black/60">
        Wer hat was hochgeladen, wann — und was kam heraus. Fehlt das Ergebnis, ist er
        unterwegs abgesprungen.
      </p>

      {loading ? (
        <div className="grid py-10 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-black/30" /></div>
      ) : sichtbar.length === 0 ? (
        <p className="py-10 text-center text-[13px] font-bold text-black/40">Noch nichts hochgeladen.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {sichtbar.map(e => (
            <div key={e.id} className="rounded-xl border border-black/10 p-2.5">
              {/* MOBIL ZUERST (Owner 16.08.2026: „und mach das in mobile design") — auf dem
                  Handy standen Adresse, Bezahlt-Marke und Loeschknopf in EINER starren Zeile:
                  die Adresse wurde zu „tigl1072…" gekuerzt, die Marken rutschten aneinander.
                  `flex-wrap` laesst die Marken in die zweite Zeile fallen, `basis-full`
                  gibt der Adresse auf schmalen Schirmen die ganze Breite. */}
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
                  <p className="truncate text-[13px] font-black text-black">
                    {e.email || <span className="text-black/40">ohne E-Mail</span>}
                  </p>
                  <p className="text-[11px] font-bold text-black/50">
                    {zeit(e.createdAt)} · {e.modelName || "—"}
                    {e.device ? ` · ${e.device.slice(0, 10)}` : ""}
                  </p>
                  {/* Kennen wir ihn schon? Bekannte anders ansprechen als Neue. */}
                  <p className="mt-1 flex flex-wrap gap-1">
                    {/* DAS PRODUKT (Owner 14.08.2026: „eine einzige Liste fuer alles, nicht
                        mehr getrennt"). In der Gesamtliste stehen Kuss, Versprechen und
                        Geburtstag untereinander — ohne diese Marke sieht man der Zeile nicht
                        an, was gekauft wurde. Auf den Themenseiten waere sie ueberfluessig
                        und bleibt deshalb dort weg. */}
                    {!theme && (
                      <span className="rounded-full bg-black/[0.07] px-2 py-0.5 text-[10px] font-black text-black/60">
                        {e.theme || "kiss"}
                      </span>
                    )}
                    {/* WIE LANGE HAT ES GEDAUERT (Owner 14.08.2026: „ich muss sehen wie
                        lange die Generierung gedauert hat") — vom Server-Start bis zur
                        Liefermail, aus den zwei Stempeln, die es schon gibt. Bei Auftraegen
                        ohne beide Stempel steht nichts, statt einer erfundenen Zahl. */}
                    {e.videoStartAt && e.videoMailedAt && (() => {
                      const min = Math.max(1, Math.round((Date.parse(String(e.videoMailedAt)) - Date.parse(String(e.videoStartAt))) / 60000));
                      return (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${min > 10 ? "bg-amber-500/15 text-amber-700" : "bg-emerald-500/15 text-emerald-600"}`}>
                          ⏱ {min} min
                        </span>
                      );
                    })()}
                    {/* WAS ER BEKOMMEN HAT — ein Tipp, und darunter steht, was wirklich in
                        seiner Galerie liegt (Owner 14.08.2026). */}
                    {e.email && (
                      <button type="button" onClick={() => void galerieHolen(String(e.email))}
                        className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-black text-sky-700 active:scale-95 transition">
                        {/* ZWEI TOEPFE, EIN ZAEHLER (Owner 14.08.2026: „bei tigl sind 4 Videos
                            in der Galerie … du zeigst 0"). Die Galerie speist sich aus den
                            AUFTRAEGEN (Kuss/Versprechen-Videos, liegen schon in `rows`) UND
                            der Try-on-Ablage (/api/my-videos). Der Knopf fragte nur die
                            zweite — bei Kunden, deren Videos an Auftraegen haengen, stand
                            eine falsche 0. */}
                        {galerie[String(e.email)] === "laden"
                          ? "Galerie …"
                          : Array.isArray(galerie[String(e.email)])
                            ? `Videos bei ihm: ${(galerie[String(e.email)] as unknown[]).length
                                + rows.filter(r => String(r.email ?? "").toLowerCase() === String(e.email ?? "").toLowerCase() && r.videoUrl).length}`
                            : "Videos bei ihm"}
                      </button>
                    )}
                    {/* DAS WARNZEICHEN ZUERST (Owner 03.08.2026): Wenn ein Upload abgewiesen
                        wurde, ist das die wichtigste Auskunft der Zeile — es muss vor
                        „bekannt/neu" stehen, nicht dahinter. */}
                    {e.altersWarnung && (
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-black text-red-600">
                        ⚠ {WARN_TEXT[e.altersWarnung] ?? e.altersWarnung}
                        {e.altersGeschaetzt ? ` (≈${e.altersGeschaetzt})` : ""}
                      </span>
                    )}
                    {/* DIE ABONNENTENLISTEN NUR AUF DEN THEMENSEITEN (Owner 14.08.2026: „wieso
                        steht da Kissing und Wetter?"). Sie sagen, in welchen Verteilern die
                        Adresse steht — in einer KAUFLISTE liest sich das wie ein Bestellinhalt
                        und stiftet nur Verwirrung. */}
                    {!theme && null}
                    {theme && (e.listen ?? []).length > 0
                      ? (e.listen ?? []).map(l => (
                          <span key={l} className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-black text-sky-600">✓ {l}</span>
                        ))
                      : theme ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-600">★ neu</span> : null}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${e.paid ? "bg-emerald-500/15 text-emerald-600" : "bg-black/[0.06] text-black/50"}`}>
                  {e.paid
                    ? `✓ ${e.paidCents ? (e.paidCents / 100).toFixed(2).replace(".", ",") + " €" : "bezahlt"}${e.paidKind ? ` · ${e.paidKind}` : ""}`
                    : "unbezahlt"}
                </span>
                <button type="button" onClick={() => void entfernen(e.id)} disabled={busy === e.id}
                  aria-label={arm === e.id ? "Wirklich löschen" : "Löschen"}
                  style={arm === e.id ? { background: "#dc2626", color: "#fff" } : undefined}
                  className={`grid h-8 shrink-0 place-items-center rounded-lg border border-red-400/40 transition active:scale-95 ${
                    arm === e.id ? "w-auto px-2.5 text-[11px] font-black" : "w-8 text-red-500"
                  }`}>
                  {busy === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : arm === e.id ? "Wirklich?" : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* AUFNAHME-THEMEN HABEN KEIN PAAR (Owner 14.08.2026: „warum stehen zwei
                  Bilder statt ein Video das er hochgeladen hat"). Die drei Spalten sind die
                  Form des KUSSES — Sie, Er, Ergebnis. Versprechen und Geburtstag haben nur
                  EINE eigene Aufnahme; ihr Standbild lag doppelt in beiden Feldern und las
                  sich wie zwei Uploads. Dort jetzt: Aufnahme · Ergebnis. Das Ergebnis-Bild
                  ist der Look-Zwischenschritt der Kette; das fertige VIDEO haengt darunter
                  am „▶ Video ansehen"-Knopf, sobald es existiert. */}
              <div className="mt-2 flex gap-2">
                {(e.theme === "versprechen" || e.theme === "birthday") ? (<>
                  <Kachel url={e.personUrl || e.modelUrl} label="Aufnahme" name={e.modelName} />
                  {/* „Ergebnis" war gelogen (Owner 14.08.2026: „hier steht rechts ein Bild
                      und nicht sein Video") — das Bild ist nur der LOOK, der Zwischenschritt
                      zur Erzeugung. Sein Ergebnis ist das VIDEO, und das bekommt die eigene
                      Spalte: da, wenn es da ist; leer, wenn nicht — die Zeile darunter sagt
                      dann, woran es haengt. */}
                  <Kachel url={e.imageUrl} label="Look" />
                  {e.videoUrl ? (
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 truncate text-[9px] font-black uppercase tracking-wide text-black/40">Video</p>
                      {/* MIT POSTER (Owner 14.08.2026: „ich begnüge mich nicht mit einem
                          schwarzen Bild") — das Look-Bild ist das erste Vollbild des
                          Avatar-Videos, also das ehrliche Standbild davor. */}
                      <button type="button" onClick={() => setGross({ url: String(e.videoUrl), video: true })}
                        className="relative block aspect-[2/3] w-full overflow-hidden rounded-lg border border-black/10"
                        style={{ background: "#111" }}>
                        {e.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={e.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : null}
                        <span className="absolute inset-0 grid place-items-center">
                          <span className="grid h-9 w-9 place-items-center rounded-full text-[16px]"
                            style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>▶</span>
                        </span>
                      </button>
                    </div>
                  ) : (
                    <Kachel label="Video" />
                  )}
                </>) : (<>
                  <Kachel url={e.modelUrl} label="Sie" name={e.modelName} />
                  <Kachel url={e.personUrl} label="Er" />
                  <Kachel url={e.imageUrl} label="Ergebnis" />
                </>)}
              </div>

              {/**
                * SEIN WEG — VON OBEN NACH UNTEN, BIS ER AUSSTEIGT (Owner 16.08.2026).
                *
                * MOBIL ZUERST (derselbe Auftrag: „und mach das in mobile design"): Der Weg ist
                * die einzige Angabe der Karte, deren Laenge niemand kennt — mal drei
                * Stationen, mal dreissig. Deshalb umbrechende Marken statt einer Tabelle und
                * statt einer Zeile, die seitwaerts aus dem Handy laeuft.
                *
                * DER THEMENWECHSEL IST DIE POINTE, nicht ein Detail: Deshalb steht der
                * Produktname NUR dann vor der Station, wenn er sich gegenueber der vorigen
                * geaendert hat — sonst verschwindet der Wechsel zwischen dreissig gleichen
                * Woertern. Die letzte Marke ist rot umrandet: Da ist er stehengeblieben.
                */}
              {(e.weg ?? []).length > 0 && (
                <div className="mt-2 rounded-lg bg-black/[0.03] p-2">
                  <p className="mb-1 text-[9px] font-black uppercase tracking-wide text-black/40">
                    Sein Weg · {(e.weg ?? []).length} Stationen
                    {e.weg?.[0]?.quelle ? ` · von ${e.weg[0].quelle}` : ""}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                    {(e.weg ?? []).map((w, i, alle) => {
                      const neuesThema = w.thema && w.thema !== alle[i - 1]?.thema;
                      const letzte = i === alle.length - 1;
                      const text = [
                        STATION[w.name] ?? w.name,
                        w.step || "",
                        w.vorlage ? `▸ ${w.vorlage}` : "",
                      ].filter(Boolean).join(" ");
                      return (
                        <span key={`${w.t}-${i}`} className="flex items-center gap-1">
                          {i > 0 && <span className="text-[10px] text-black/25">→</span>}
                          {neuesThema && (
                            <span className="rounded-l-full bg-black/[0.07] py-0.5 pl-2 pr-1 text-[10px] font-black text-black/70">
                              {w.thema}
                            </span>
                          )}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                            letzte
                              ? "bg-red-500/10 text-red-600 ring-1 ring-red-400/40"
                              : w.name === "payment_completed"
                                ? "bg-emerald-500/15 text-emerald-700"
                                : "bg-white text-black/60"
                          } ${neuesThema ? "rounded-l-none" : ""}`}>
                            {text}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-[9px] font-bold text-black/35">
                    zuletzt {zeit(String(e.weg?.[(e.weg?.length ?? 1) - 1]?.t ?? ""))} — dort ausgestiegen
                  </p>
                </div>
              )}

              {/* HAT ER POST BEKOMMEN? (Owner 14.08.2026: „ich will dass da auch steht ob er
                  eine email bekommen hat mit dem bild").
                  Die Stempel setzt kiss-delivery NACH erfolgreichem Versand — steht hier
                  nichts, ist die Mail nie rausgegangen. Nur bei bezahlten Auftraegen: bei
                  einem abgebrochenen Besuch waere „keine Mail" keine Auskunft, sondern
                  selbstverstaendlich. */}
              {e.paid && (
                <p className={`mt-2 rounded-lg px-2 py-1.5 text-[11px] font-black ${
                  e.videoMailedAt || e.programmMailAt ? "bg-emerald-500/10 text-emerald-700" : "bg-red-500/10 text-red-600"
                }`}>
                  {e.videoMailedAt
                    ? `✉ Ergebnis verschickt — ${zeit(e.videoMailedAt)}`
                    : e.programmMailAt
                      ? `✉ Programm-Mail verschickt — ${zeit(e.programmMailAt)}`
                      : "✉ Keine Mail verschickt"}
                </p>
              )}

              {/* SEINE GALERIE — was beim KUNDEN angekommen ist (Owner 14.08.2026). Der
                  Auftrag oben sagt, was bestellt wurde; hier steht, was er hat. Leer heisst:
                  bezahlt und nichts bekommen — genau der Fall, den du sonst erst aus einer
                  Beschwerde erfaehrst. */}
              {e.email && Array.isArray(galerie[String(e.email)]) && (
                ((galerie[String(e.email)] as { url: string; poster?: string }[]).length
                  + rows.filter(r => String(r.email ?? "").toLowerCase() === String(e.email ?? "").toLowerCase() && r.videoUrl).length) === 0 ? (
                  <p className="mt-2 rounded-lg bg-red-500/10 px-2 py-1.5 text-[11px] font-black text-red-600">
                    Kein einziges Video bei diesem Kunden — weder an seinen Auftraegen noch
                    in der Try-on-Ablage. (Bilder zaehlt diese Abfrage nicht.)
                  </p>
                ) : (galerie[String(e.email)] as { url: string; poster?: string }[]).length === 0 ? (
                  <p className="mt-2 rounded-lg bg-emerald-500/10 px-2 py-1.5 text-[11px] font-bold text-emerald-700">
                    Seine Videos haengen an den Auftraegen — die ▶-Kacheln in seinen Zeilen
                    sind genau das, was seine Galerie zeigt.
                  </p>
                ) : (
                  <div className="mt-2">
                    <p className="text-[10px] font-black uppercase tracking-wide text-black/40">Videos in seiner Galerie</p>
                    <div className="mt-1 flex gap-2 overflow-x-auto">
                      {(galerie[String(e.email)] as { url: string; poster?: string }[]).slice(0, 8).map((v, i) => (
                        <a key={i} href={v.url} target="_blank" rel="noreferrer"
                          className="block h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-black/5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {v.poster ? <img src={v.poster} alt="" className="h-full w-full object-cover" /> : null}
                        </a>
                      ))}
                    </div>
                  </div>
                )
              )}

              {/* BEZAHLT, ABER NOCH KEIN VIDEO — der Zustand, der dich Geld kostet, wenn ihn
                  niemand sieht. Der Server liefert selbst nach (siehe /api/kiss-deliver);
                  hier steht, wie weit er ist und woran es hakt. */}
              {e.paid && (e.videoId ? e.videoId !== e.videoDoneId : !e.videoUrl) && (
                <p className="mt-2 rounded-lg bg-amber-500/10 px-2 py-1.5 text-[11px] font-bold text-amber-700">
                  {e.videoError
                    ? `Video offen — ${e.videoError} (${e.videoTries ?? 0}. Anlauf)`
                    : e.videoId
                      ? "Video läuft — der Server holt es ab und schickt es per Mail."
                      : "Bezahlt — der Server startet das Video gleich."}
                </p>
              )}
              {e.videoUrl && e.videoMailedAt && (
                <p className="mt-2 text-[10px] font-bold text-emerald-600">✓ Video verschickt</p>
              )}

              {e.videoUrl && (
                <button type="button" onClick={() => setGross({ url: String(e.videoUrl), video: true })}
                  className="mt-2 flex h-9 w-full items-center justify-center rounded-lg bg-black text-[12px] font-black"
                  style={{ color: "#fff" }}>
                  ▶ Video ansehen
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* DIE VOLLBILD-SCHICHT (Owner 14.08.2026: „ich kann das nicht schliessen") — im
          Admin statt in einem fremden Tab: Kreuz oben rechts, und jeder Tipp neben dem
          Medium schliesst ebenfalls. Nichts hier kann in einer Sackgasse enden. */}
      {gross && (
        <div className="fixed inset-0 z-[200] grid place-items-center p-4" style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setGross(null)}>
          <button type="button" onClick={() => setGross(null)} aria-label="Schliessen"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white text-[16px] font-black text-black">
            ✕
          </button>
          {gross.video ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={gross.url} controls autoPlay playsInline onClick={ev => ev.stopPropagation()}
              className="max-h-[85vh] max-w-full rounded-xl" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gross.url} alt="" onClick={ev => ev.stopPropagation()}
              className="max-h-[85vh] max-w-full rounded-xl object-contain" />
          )}
        </div>
      )}
    </div>
  );
}
