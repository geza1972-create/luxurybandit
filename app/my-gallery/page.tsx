"use client";

import { useEffect, useState } from "react";
import { Play, Download, X, Loader2, Trash2, Send } from "lucide-react";
import { kontoText, spracheAusCookie, themaUndMedium, themaWort } from "@/lib/konto-i18n";
import type { Lang } from "@/lib/lang";
import { ThemenKreise, Knopf } from "@/components/CI";
import TopNav from "@/components/TopNav";
import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import Reaktionen from "@/components/Reaktionen";
import { musikFuer } from "@/lib/musik";
import { geburtstagTitel } from "@/lib/geburtstag";
import { aktiveAdresse } from "@/lib/guthaben-konto";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { geraetGiltAlsAusweis } from "@/lib/abmelden-spuren";
import { kissText } from "@/lib/kiss-i18n";
import { eur } from "@/lib/pricing";

// „My Gallery" als eigene Seite: ALLE generierten Try-on-Videos (dieselbe Quelle wie
// im Funnel, /api/try-this-look?adminPosts=1) — von überall über das Menü erreichbar.
// Tippen öffnet Vollbild mit Download. Nur für den Admin (PIN aus dem Browser).

/**
 * DIE WARNZEICHEN (Owner 31.07.2026: „du machst mir aber in der Galerie ein Warnzeichen
 * drauf"). Sie stehen hier und nicht im Prüf-Baustein, weil sie zur ANZEIGE gehören — der
 * Server liefert nur das nüchterne Urteil.
 */
const WARN_ZEICHEN: Record<string, string> = {
  "kind-nackt": "⛔",
  minderjaehrig: "⚠️",
  nacktheit: "🔞",
  unklar: "❓",
  "kein-gesicht": "❓",
};
const WARN_TEXT: Record<string, string> = {
  "kind-nackt": "Kind + Nacktheit — wurde abgewiesen",
  minderjaehrig: "Könnte minderjährig sein — bitte ansehen",
  nacktheit: "Nacktheit erkannt",
  unklar: "Konnte nicht geprüft werden",
  "kein-gesicht": "Kein Gesicht erkannt",
};

type Item = {
  id: string;
  /**
   * "program" IST DIE PROGRAMM-KACHEL (11.08.2026, Owner: „Das habe ich komplett
   * übersehen … Muss in der Galerie stehen"). Sie ist ein ganz normales Raster-Element,
   * kein Video/Slide — nur ihr Klick-Ziel ist anders (siehe `onClick` unten).
   */
  type?: "video" | "slide" | "program";   // Try-on-Video vs. Card-Studio-Slide (Urlaub/Peter-Fotos) vs. Programm
  imageUrl: string;
  videoUrl?: string;
  /** Bezahlt, Video noch in Arbeit — die Kachel sagt es (Owner 08.08.2026). */
  rendert?: boolean;
  lookName?: string;
  curatorId?: string;
  curatorName?: string;
  garment?: string;   // manuell zugewiesen: "lingerie" | "normal"
  source?: string;    // "kiss" | "kiss-upload" — nur die darf der Besitzer selbst löschen
  theme?: string;     // fuer die Karten-Vorschau: kiss | wedding | idol
  empfaenger?: string; // der Name, der in den aufsteigenden Zeilen steht
  /**
   * DER LINK ZUM 30-TAGE-PROGRAMM (11.08.2026, Owner: „wo ist der link zum plan?").
   * Kommt fertig aus /api/my-videos (`futureProgramUrl`) — nur bei theme==="versprechen"
   * UND nur, wenn die Programm-Datei serverseitig wirklich existiert. Leer/undefined = kein
   * Knopf, nie selbst berechnen (der Token braucht das Server-Geheimnis).
   */
  programUrl?: string;
  /**
   * URTEIL DER ALTERS- UND NACKTHEITSPRÜFUNG (Owner 31.07.2026: „du machst mir aber in der
   * Galerie ein Warnzeichen drauf"). Nur gesetzt, wenn etwas auffiel — im Beobachten-Modus
   * geht der Upload durch UND traegt das Zeichen.
   */
  warnung?: string;
  alter?: number;
  feed?: boolean;
  public?: boolean;
  /**
   * DIE DATENZEILE JE WERK (Owner 11.08.2026: „stehen auch keine Daten, wann ich das
   * aufgenommen habe für was. Oder generiert wann, gekauft für wieviel, wie lang das video
   * ist"). Kommt fertig aus /api/my-videos — nie selbst berechnet (der Preis braucht die
   * Tabelle aus lib/pricing, Memory `prices-only-from-pricing-table`).
   */
  createdAt?: string;
  videoFertigAt?: string;
  paid?: boolean;
  preisCents?: number;
};

export default function MyGalleryPage() {
  const [pin, setPin] = useState("");
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Item | null>(null);
  const [query, setQuery] = useState("");   // Model-/Look-Suche (z. B. „Bella")

  // Admin: Video öffentlich (gratis Teaser im Chat) ↔ privat (🔒 Abo) schalten.
  const setPublic = async (it: Item, pub: boolean) => {
    if (!pin) return;
    setItems(list => list.map(x => x.id === it.id ? { ...x, public: pub, feed: pub ? true : false } : x));
    const h = { "Content-Type": "application/json", "x-try-look-admin-pin": pin };
    try {
      await fetch("/api/try-this-look", { method: "POST", headers: h, body: JSON.stringify({ action: "set-generation-public", generationId: it.id, public: pub }) });
      if (!pub) await fetch("/api/try-this-look", { method: "POST", headers: h, body: JSON.stringify({ action: "set-generation-feed", generationId: it.id, feed: false }) });
    } catch { /* optimistisch — beim nächsten Laden korrekt */ }
  };

  // Mehrfachauswahl: auswählen → Bulk Public/Private oder Löschen. Nur VIDEOS (Slides = Card Studio).
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSel = (id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const clearSel = () => { setSelected(new Set()); setSelectMode(false); };
  const hdr = () => ({ "Content-Type": "application/json", "x-try-look-admin-pin": pin });
  // Ausgewählte Slides (id = "slide:<cid>:<sid>") nach Model gruppieren + gepatcht committen.
  const patchSlides = async (ids: string[], patch: { private?: boolean; garmentCat?: string; remove?: boolean }) => {
    const byCid = new Map<string, string[]>();
    ids.forEach(id => { const m = /^slide:([^:]+):(.+)$/.exec(id); if (m) { const a = byCid.get(m[1]) ?? []; a.push(m[2]); byCid.set(m[1], a); } });
    for (const [cid, sids] of byCid) {
      try { await fetch("/api/bella-carousel", { method: "POST", headers: hdr(), body: JSON.stringify({ model: cid, bulkSlides: { ids: sids, patch } }) }); } catch { /**/ }
    }
  };
  const splitSel = () => { const sel = [...selected]; return { sel, vids: sel.filter(id => items.find(it => it.id === id)?.type !== "slide"), slds: sel.filter(id => items.find(it => it.id === id)?.type === "slide") }; };

  const bulkPublic = async (pub: boolean) => {
    if (!pin) return;
    const { sel, vids, slds } = splitSel();
    if (!sel.length) return;
    setItems(list => list.map(x => sel.includes(x.id) ? { ...x, public: pub } : x));
    for (const id of vids) {
      try {
        await fetch("/api/try-this-look", { method: "POST", headers: hdr(), body: JSON.stringify({ action: "set-generation-public", generationId: id, public: pub }) });
        if (!pub) await fetch("/api/try-this-look", { method: "POST", headers: hdr(), body: JSON.stringify({ action: "set-generation-feed", generationId: id, feed: false }) });
      } catch { /**/ }
    }
    await patchSlides(slds, { private: !pub });   // Slide: public = nicht privat
    clearSel();
  };
  const bulkDelete = async () => {
    if (!pin) return;
    const { sel, vids, slds } = splitSel();
    if (!sel.length) return;
    if (typeof window !== "undefined" && !window.confirm(`${sel.length} Element(e) endgültig löschen?`)) return;
    for (const id of vids) { try { await fetch("/api/try-this-look", { method: "POST", headers: hdr(), body: JSON.stringify({ action: "delete-generation", id }) }); } catch { /**/ } }
    await patchSlides(slds, { remove: true });
    clearSel();
    /* Auch hier: erst der Server, dann die Anzeige — nicht umgekehrt (siehe unten). */
    window.location.reload();
  };

  /**
   * SEIN EIGENES LÖSCHEN (Owner 30.07.2026: „kann er sie auch löschen?").
   *
   * Der Sammel-Löscher darüber ist admin-gebunden. Ein Kunde muss seine eigenen Stücke
   * loswerden können, ohne uns zu fragen — die Route lässt es zu, wenn Gerät oder
   * angemeldete Adresse zum Eintrag passen.
   */
  /**
   * LOESCHEN SAGT JETZT, WENN ES NICHT GEHT (Owner 03.08.2026: „ich kann keine Bilder
   * löschen").
   *
   * HIER LAG DER FEHLER, UND ER WAR EINE STILLE LUEGE: Die Kachel verschwand sofort aus der
   * Anzeige, der Server antwortete mit 403 („Not yours."), und der `catch` verschluckte es.
   * Beim naechsten Laden war das Bild wieder da. Fuer den Kunden sieht das aus, als komme es
   * von den Toten zurueck — und er versucht es wieder und wieder.
   *
   * ZWEI AENDERUNGEN:
   * 1) Die ADRESSE reist mit. Der Server erlaubt Loeschen, wenn GERAET oder angemeldete
   *    Adresse zum Eintrag passen. Wer den Browser gewechselt hat, scheiterte bisher am
   *    Geraet, obwohl seine Adresse am Eintrag steht.
   * 2) Die Kachel verschwindet ERST, wenn der Server zugestimmt hat — und wenn nicht, sagt
   *    eine Meldung warum. Optimistisch loeschen ist richtig, wenn es fast immer klappt;
   *    hier klappte es fast nie.
   */
  /**
   * ZWEI TIPPS STATT SYSTEMDIALOG (Owner 03.08.2026: „du hast mal das Löschen viel eleganter
   * gemacht als das — es wurde rot, das Icon").
   *
   * Hier stand `window.confirm()`: eine weiße Systemkiste mit blauem „OK/Abbrechen" mitten in
   * einer schwarzen Galerie, in der Sprache des Browsers statt in seiner. Der erste Tipp
   * färbt den Papierkorb jetzt rot, der zweite löscht wirklich, und nach drei Sekunden ist er
   * wieder harmlos — ein Knopf, der scharf bleibt, ist eine Falle für den nächsten Fingertipp.
   *
   * Die ID und nicht `true`: Sonst leuchten alle Papierkörbe der Galerie gleichzeitig rot.
   * Dasselbe Muster wie das Abmelden in `components/WetterProfileAsk.tsx`.
   */
  const [loeschScharf, setLoeschScharf] = useState("");
  const eigenesLoeschen = async (it: Item) => {
    /* AUCH `-frau` ABSTREIFEN (12.08.2026): Die Kiss-Route liefert je Eintrag DREI Kacheln
       (X, X-frau, X-foto) — hier wurde nur `-foto` auf die echte Kennung zurückgeführt. Ein
       Löschversuch an der „Deine Frau"-Kachel schickte `X-frau`, die Route fand keinen
       Eintrag und antwortete mit dem irreführenden „Not yours."
       Und `programm:` VORNE (12.08.2026, „ein Kauf, eine Kachel"): die Programm-Kachel trägt
       den Präfix, gelöscht wird derselbe Auftrag. */
    const id = it.id.replace(/-(foto|frau)$/, "").replace(/^programm:/, "");
    if (loeschScharf !== it.id) {
      setLoeschScharf(it.id);
      setTimeout(() => setLoeschScharf(s => (s === it.id ? "" : s)), 3000);
      return;
    }
    setLoeschScharf("");
    try {
      let device = "";
      try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
      const tok = getStoredAuthSession()?.access_token ?? "";
      const adresse = aktiveAdresse();
      const r = await fetch("/api/kiss-log", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        body: JSON.stringify({ remove: id, device, email: adresse }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        alert(d?.error === "Not yours." ? T.loeschFehlerFremd : (d?.error || T.loeschFehler));
        return;
      }
      /**
       * NACH DEM LOESCHEN WIRD DIE SEITE NEU GELADEN (Owner 03.08.2026: „wieso kommt nach
       * Löschen der Kacheln kein Reload der Seite?").
       *
       * Hier stand nur `setItems(...)` — die Kachel verschwand aus MEINER Liste im Browser.
       * Genau das war schon einmal die Ursache: Die Anzeige sagte „weg", der Server hatte
       * etwas anderes getan, und beim naechsten Laden stand das Stueck wieder da. Eine Liste,
       * die der Browser fuer sich weiterfuehrt, ist eine zweite Wahrheit neben der echten.
       *
       * Die Galerie zieht ihre Kacheln aus DREI Quellen (Kiss-Log, /api/my-videos, Slides) in
       * einem gewachsenen Effekt zusammen; es gibt keine eine Funktion, die man nachrufen
       * koennte. Ein Neuladen ist hier deshalb nicht die faule, sondern die ehrliche Loesung:
       * Was danach steht, steht wirklich auf dem Server.
       */
      window.location.reload();
    } catch {
      alert(T.keineVerbindung);
    }
  };

  const [statusFilter, setStatusFilter] = useState<"all" | "public" | "private">("all");   // Freigabe-Status
  const [typeFilter, setTypeFilter] = useState<"all" | "video" | "slide">("all");          // Videos vs. Slides
  const [catFilter, setCatFilter] = useState<"all" | "lingerie" | "normal" | "reise">("all");
  // Kategorie ≈ Theme: manuelles Tag gewinnt; Card-Slides = Reise (Story-Tool); sonst Video-Heuristik.
  const catOf = (it: Item): "lingerie" | "normal" | "reise" => {
    if (it.garment === "lingerie") return "lingerie";
    if (it.garment === "normal") return "normal";
    if (it.type === "slide") return "reise";   // Card-Studio-Content ist Reise/Story — außer manuell umgetaggt
    const s = `${it.lookName || ""}`.toLowerCase();
    if (/lingerie|boudoir|dessous|lace|thong|underwear|unterwäsche|bikini|swim|bh\b/.test(s)) return "lingerie";
    return "normal";
  };
  const bulkGarment = async (garment: "lingerie" | "normal") => {
    if (!pin) return;
    const { sel, vids, slds } = splitSel();
    if (!sel.length) return;
    setItems(list => list.map(x => sel.includes(x.id) ? { ...x, garment } : x));
    for (const id of vids) { try { await fetch("/api/try-this-look", { method: "POST", headers: hdr(), body: JSON.stringify({ action: "set-generation-garment", generationId: id, garment }) }); } catch { /**/ } }
    await patchSlides(slds, { garmentCat: garment });
    clearSel();
  };
  const q = query.trim().toLowerCase();
  const shown = items.filter(it => {
    if (q && !((it.curatorName || "").toLowerCase().includes(q) || (it.lookName || "").toLowerCase().includes(q))) return false;
    if (typeFilter !== "all" && (it.type ?? "video") !== typeFilter) return false;
    if (catFilter !== "all" && catOf(it) !== catFilter) return false;
    if (statusFilter === "public") return it.public === true;
    if (statusFilter === "private") return it.public !== true;
    return true;
  });
  const pubCount = items.filter(it => it.public === true).length;
  const vidCount = items.filter(it => (it.type ?? "video") === "video").length;
  const catCount = (c: "lingerie" | "normal" | "reise") => items.filter(it => catOf(it) === c).length;

  useEffect(() => {
    let p = "";
    try { p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { /**/ }
    setPin(p);
    setToken(getStoredAuthSession()?.access_token ?? "");
    setReady(true);
  }, []);

  // Admin (PIN) → ALLE generierten Videos. Eingeloggter User → NUR seine eigenen Try-ons.
  /**
   * DER PULS AM CHIP ERLISCHT MIT DEM BESUCH (Owner 08.08.2026: „bis der user die galerie
   * öffnet"). Der Punkt ist eine Benachrichtigung, kein Dauerzustand: Wer die Galerie
   * gesehen hat, weiss Bescheid — erst ein NEUER Lauf (jüngeres createdAt) weckt ihn wieder.
   */
  /**
   * SIEBEN SPRACHEN AUCH NACH DEM KAUF (Owner 08.08.2026: „so jetzt muss alles auf englisch
   * übersetzt werden und alle sprachen"). Erst nach dem ersten Rendern gelesen — sonst
   * unterscheiden sich Server- und Browser-Durchgang (Hydration). Bis dahin Englisch.
   */
  /** Sein Avatar — Gesicht und Stimme, mit denen jedes Video gebaut wird. */
  const [avatar, setAvatar] = useState<{ imageUrl: string; stimme: boolean } | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => { setLang(spracheAusCookie()); }, []);
  const T = kontoText(lang);

  useEffect(() => {
    try { localStorage.setItem("lb_galerie_gesehen", new Date().toISOString()); } catch { /**/ }
    try { window.dispatchEvent(new Event("lb-galerie-gesehen")); } catch { /**/ }
  }, []);

  /**
   * MELDET ER SICH AB, WÄHREND ER HIER STEHT, IST DIE SEITE SOFORT LEER (Owner 10.08.2026:
   * „wenn er sich abmeldet dann ist es weg").
   *
   * Das Löschen im Gerät allein reicht nicht: Was schon geladen ist, steht im Arbeitsspeicher
   * dieser Seite und bliebe sichtbar, bis jemand neu lädt — und genau in dieser Minute reicht
   * er das Handy weiter. Sein Gesicht (der Avatar) geht als Erstes.
   */
  useEffect(() => {
    const leeren = () => { setItems([]); setAvatar(null); };
    window.addEventListener("lb-abgemeldet", leeren);
    return () => window.removeEventListener("lb-abgemeldet", leeren);
  }, []);

  useEffect(() => {
    if (!ready) return;
    // EIGENE VIDEOS (Chat/Try-on ohne Konto): haengen am Geraet — und zusaetzlich an der
    // E-Mail, sobald er angemeldet ist (Owner 28.07.2026). Laeuft unabhaengig vom Admin-Weg.
    /**
     * NACH DEM ABMELDEN IST DIE GERÄTEKENNUNG KEIN AUSWEIS MEHR (Owner 10.08.2026: „Kann sein
     * dass jemand anders sein gerät in die Hand nimmt und dann sieht er seine gallerie").
     *
     * Genau hier lag das Leck: Die Galerie fragte IMMER mit `lb_visitor`, und die Kennung
     * bleibt im Gerät (sie ist der Riegel vor der Geldbörse, deshalb wird sie beim Abmelden
     * nicht gelöscht). Wer sich abmeldete, verlor seinen Ausweis — seine Werke lagen trotzdem
     * weiter offen, für jeden, der das Handy danach in der Hand hatte. Ab jetzt gilt sie nur,
     * solange niemand sich abgemeldet hat; danach zählt allein die Anmeldung.
     */
    const device = geraetGiltAlsAusweis()
      ? (() => { try { return localStorage.getItem("lb_visitor") ?? ""; } catch { return ""; } })()
      : "";
    /**
     * DIESELBE ADRESSE WIE ALLE ANDEREN (Owner 03.08.2026: „und in meiner Galerie ist nichts
     * gespeichert" — angemeldet, Video erzeugt, Galerie leer).
     *
     * Hier stand NUR die Supabase-Sitzung. Wer sich mit seiner Kuss-Adresse angemeldet hat —
     * der uebliche Weg im Trichter, und der einzige fuer jemanden ohne Konto — hatte an dieser
     * Stelle gar keine Adresse: Die Anfrage ging mit leerem `email` raus und fand nichts,
     * obwohl sein bezahltes Video mit genau dieser Adresse im Protokoll stand.
     * `aktiveAdresse()` ist dieselbe Regel wie im Header-Chip und im Trichter.
     */
    const mail = aktiveAdresse();
    /**
     * SOLANGE ETWAS LAEUFT, SCHAUT DIE SEITE VON SELBST NACH (Owner 08.08.2026: „es muss
     * doch in der Galerie auch zeigen dass das noch was zu ende rendert" · „bald in der
     * galerie erscheint").
     *
     * Ohne das ist der Hinweis ein Versprechen ohne Einloesung: Der Kaeufer sieht „Video
     * entsteht" und muss RATEN, wann er neu laden soll — genau das hat der Owner erlebt
     * (Video bei HeyGen laengst fertig, Galerie zeigte weiter den Balken). Alle 15 s eine
     * Anfrage, aber NUR solange wirklich etwas offen ist; ist nichts offen, hoert sie auf.
     */
    let takt: ReturnType<typeof setTimeout> | null = null;
    const nachladen = () => {
      /* DIE ANMELDUNG REIST MIT (Owner 10.08.2026: „Der User meldet sich doch an. Basta").
         Damit findet die Route sein Konto — auch auf einem Gerät, das für diese Adresse noch
         nie bezahlt hat. Genau daran hing der Avatar: Ohne Ausweis gab die Route ihn nicht
         heraus (Geräte-Riegel), und die Zeile in der Galerie blieb leer. */
      const sitzung = (() => { try { return getStoredAuthSession()?.access_token ?? ""; } catch { return ""; } })();
      fetch(`/api/my-videos?device=${encodeURIComponent(device)}&email=${encodeURIComponent(mail)}`,
        { cache: "no-store", ...(sitzung ? { headers: { Authorization: `Bearer ${sitzung}` } } : {}) })
        .then(r => r.json())
        .then(d => {
          const own: Item[] = (Array.isArray(d?.videos) ? d.videos : []).map((v: { id: string; videoUrl: string; posterUrl?: string; name?: string }) => ({
            id: v.id, type: "video" as const, imageUrl: v.posterUrl || "", videoUrl: v.videoUrl, lookName: v.name || "",
          }));
          // DIE KISS-BILDER GEHÖREN HIER HIN (Owner 30.07.2026: „seine Galerie ist leer,
          // seine Bilder sind nicht da"). Sie liegen im Kiss-Log; die Route liefert sie jetzt
          // als `pictures` mit — zugeordnet über E-Mail oder Gerät.
          const bilder: Item[] = (Array.isArray(d?.pictures) ? d.pictures : [])
            .map((b: { id: string; imageUrl?: string; videoUrl?: string; name?: string; source?: string; warnung?: string; alter?: number; theme?: string; empfaenger?: string; rendert?: boolean; programUrl?: string; createdAt?: string; videoFertigAt?: string; paid?: boolean; preisCents?: number }) => ({
              id: b.id,
              type: (b.videoUrl ? "video" : "image") as "video" | "image",
              rendert: b.rendert === true,
              imageUrl: b.imageUrl || "",
              videoUrl: b.videoUrl || "",
              lookName: b.name || "",
              source: b.source || "kiss",
              /* NIE GERATEN — leer bleibt leer, siehe /api/my-videos. Ein falsches Thema auf
                 einem privaten Werk ist kein Kosmetik-Fehler (Owner 11.08.2026). */
              theme: b.theme || "",
              empfaenger: b.empfaenger || "",
              warnung: b.warnung || "",
              alter: b.alter || 0,
              programUrl: b.programUrl || "",
              createdAt: b.createdAt || "",
              videoFertigAt: b.videoFertigAt || "",
              paid: b.paid === true,
              preisCents: b.preisCents,
            }))
            /**
             * EIN LAUFENDER AUFTRAG BLEIBT DRIN, AUCH OHNE BILD (Owner 08.08.2026: „Zuerst
             * war nichts in der Galerie zu sehen. Dann mache ich reload, dann ist das Bild
             * da, statisch. Dann einige Minuten später … dass das Video lädt").
             *
             * Das war der Grund fuer die erste Leere: Direkt nach der Zahlung gibt es noch
             * KEIN Bild — das entsteht erst in der Minute darauf. Dieser Filter warf die
             * Kachel deshalb weg, und der Kaeufer stand vor einer Galerie, die so tat, als
             * haette er nichts gekauft. Wer bezahlt hat, sieht seinen Platz sofort.
             */
            .filter((b: Item) => b.imageUrl || b.videoUrl || b.rendert);
          /**
           * DAS PROGRAMM IST EINE GANZ NORMALE KACHEL (Owner 11.08.2026: „Das habe ich
           * komplett übersehen … Muss in der Galerie stehen … statt privat Programm").
           *
           * Es stand bis hierher in einer eigenen Sonderkarte über allem — der Käufer sah es
           * trotzdem nicht, weil er die Galerie wie ein Album liest, nicht wie ein Formular
           * mit Kästchen darüber. Jetzt ist es EIN Item wie jedes Video, an seinem
           * chronologischen Platz (`createdAt`), mit demselben Format 9:16.
           */
          const progs = (Array.isArray(d?.programme) ? d.programme : [])
            .map((p: { id: string; programUrl?: string; film?: string; createdAt?: string; videoFertigAt?: string; posterUrl?: string; videoUrl?: string; preisCents?: number }) => ({
              id: String(p.id), programUrl: String(p.programUrl || ""), film: String(p.film || "kommt"),
              createdAt: String(p.createdAt || ""), videoFertigAt: String(p.videoFertigAt || ""),
              posterUrl: String(p.posterUrl || ""), videoUrl: String(p.videoUrl || ""), preisCents: p.preisCents,
            }))
            .filter((p: { programUrl: string }) => !!p.programUrl);
          const progItems: Item[] = progs.map((p: { id: string; programUrl: string; createdAt: string; videoFertigAt: string; posterUrl: string; videoUrl: string; preisCents?: number }) => ({
            id: `programm:${p.id}`, type: "program" as const, imageUrl: p.posterUrl, videoUrl: p.videoUrl,
            lookName: "Future Self Program", theme: "versprechen",
            createdAt: p.createdAt, videoFertigAt: p.videoFertigAt,
            paid: true, preisCents: p.preisCents, programUrl: p.programUrl,
          }));
          /**
           * EIN KAUF, EINE KACHEL (Owner 12.08.2026, an zwei identischen Kacheln nebeneinander:
           * „was sind die zwei jetzt?"). Sobald die Programm-Kachel eines Auftrags existiert,
           * entfällt seine normale Video-Kachel — sonst steht derselbe Kauf zweimal da
           * (die Programm-Kachel zeigt das Video ohnehin, und der Film spielt zusätzlich
           * ganz oben auf der Programmseite).
           */
          const progIds = new Set(progs.map((p: { id: string }) => p.id));
          const ohneDoppel = bilder.filter(b => !(b.theme === "versprechen" && progIds.has(b.id)));
          /* AN IHREM CHRONOLOGISCHEN PLATZ, NICHT ANGEHÄNGT: `bilder` kommt aus dem Kiss-Log
             bereits neuestes-zuerst sortiert; die Programm-Kachel teilt dieselben Zeitstempel
             und wird hier einsortiert statt hintenangestellt — sonst landete sie immer ganz
             unten, egal wie frisch der Kauf war. */
          own.push(...[...ohneDoppel, ...progItems].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
          if (own.length) setItems(prev => [...own, ...prev.filter(x => !own.some(o => o.id === x.id))]);
          if (d?.avatar?.imageUrl) setAvatar({ imageUrl: String(d.avatar.imageUrl), stimme: !!d.avatar.stimme });
          /* Weiter nachschauen, solange ein Auftrag offen ist — sonst Ruhe. Ein Programm,
             dessen Film noch entsteht, zählt genauso: seine Karte soll von selbst auf
             „fertig" umspringen, ohne dass der Käufer neu lädt. */
          if (own.some(x => x.rendert) || progs.some((p: { film: string }) => p.film === "kommt")) takt = setTimeout(nachladen, 15_000);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    if (device || mail) nachladen();
    if (!pin && !token) { setLoading(false); return; }
    const url = pin ? "/api/try-this-look?adminPosts=1" : "/api/try-this-look?mine=1";
    const headers: Record<string, string> = pin
      ? { "x-try-look-admin-pin": pin }
      : { Authorization: `Bearer ${token}` };
    fetch(url, { headers, cache: "no-store" })
      .then(r => r.json())
      .then(async d => {
        const raw = Array.isArray(d.posts) ? d.posts : Array.isArray(d.userGallery) ? d.userGallery : [];
        const vids: Item[] = (raw as Item[]).filter(v => v.videoUrl || v.imageUrl).map(v => ({ ...v, type: "video" as const }));
        // ERGÄNZEN, NICHT ERSETZEN (Owner 30.07.2026: „es waren kurz alle Bilder zu sehen,
        // dann verschwunden"). Die Seite lädt zweimal: erst seine Kiss-Bilder aus
        // /api/my-videos, danach die Try-On-Liste. Ein `setItems(vids)` warf die erste
        // Ladung weg — genau das sah man: kurz da, dann fort.
        setItems(prev => {
          const behalten = prev.filter(x => !vids.some((v: Item) => v.id === x.id));
          return [...behalten, ...vids];
        });
        // Admin: zusätzlich die Card-Studio-Slides (Urlaub/Peter-Fotos) je Model anhängen —
        // damit ALLE Inhalte + Freigabe an EINEM Ort stehen. Slide: public = nicht privat.
        if (!pin) return;
        const nameById = new Map<string, string>();
        vids.forEach(v => { if (v.curatorId) nameById.set(v.curatorId, v.curatorName || ""); });
        const slideItems: Item[] = [];
        for (const cid of [...nameById.keys()].filter(Boolean)) {
          try {
            const sd = await fetch(`/api/bella-carousel?model=${encodeURIComponent(cid)}`, { headers: { "x-try-look-admin-pin": pin }, cache: "no-store" }).then(r => r.json());
            const slides: Array<Record<string, unknown>> = Array.isArray(sd?.slides) ? sd.slides : [];
            slides.filter(s => !s.customer && (s.mediaUrl || s.posterUrl)).forEach(s => {
              slideItems.push({
                id: `slide:${cid}:${String(s.id)}`, type: "slide", curatorId: cid, curatorName: nameById.get(cid) || "",
                lookName: String(s.title || ""),
                imageUrl: String(s.kind === "video" ? (s.posterUrl || s.mediaUrl) : s.mediaUrl),
                videoUrl: s.kind === "video" ? String(s.mediaUrl || "") : undefined,
                garment: String(s.garmentCat || ""),
                public: s.private !== true,
              });
            });
          } catch { /**/ }
        }
        if (slideItems.length) setItems(prev => [...prev, ...slideItems]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    /* Der Nachlade-Takt darf die Seite nicht ueberleben. */
    return () => { if (takt) clearTimeout(takt); };
  }, [ready, pin, token]);

  // Cross-origin (Supabase) → per Blob laden, damit der Browser wirklich SPEICHERT
  // statt nur zu öffnen. Fällt auf „in neuem Tab öffnen" zurück, falls CORS blockt.
  /** Teilen-Rueckmeldung: „kopiert" statt eines stummen Knopfs. */
  const [teilenBusy, setTeilenBusy] = useState(false);
  const [teilenText, setTeilenText] = useState("");

  /**
   * WIE LANG DAS VIDEO IST — nirgends gespeichert, kommt aus dem Spieler selbst (Owner
   * 11.08.2026: „Wie lang das video ist"). Ein eigenes, unsichtbares `<video>` mit
   * `preload="metadata"` lädt nur den Kopf der Datei (ein paar Zehnerkilobyte), nicht den
   * Film — dieselbe Sparsamkeit wie das Kachel-Standbild weiter oben. Wird bei jedem neuen
   * `open` zurückgesetzt, sonst stünde kurz die Länge des vorigen Videos da.
   */
  const [offenDauer, setOffenDauer] = useState("");
  useEffect(() => { setOffenDauer(""); }, [open?.id]);

  /**
   * TEILEN: erst freischalten, dann verschicken.
   *
   * Die Werk-Seite /w/<id> ist privat, bis der Besitzer teilt — das ist die Zusage, die im
   * Trichter unter jedem Schritt steht. Deshalb ZUERST der Stempel und erst danach der Link;
   * andersherum verschickt er einen Link, hinter dem „Diese Karte ist privat" steht.
   *
   * Schlaegt das Freischalten fehl (Try-on-Videos zum Beispiel haben gar keinen Werk-Eintrag),
   * geht die direkte Video-Adresse raus. Lieber ein nackter Link als kein Link.
   */
  const teilen = async (it: Item) => {
    setTeilenBusy(true); setTeilenText("");
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    let url = it.videoUrl ?? "";
    try {
      const r = await fetch("/api/kiss-log", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share: it.id, device }),
      });
      if (r.ok) url = `${window.location.origin}/w/${encodeURIComponent(it.id)}`;
    } catch { /* bleibt bei der direkten Adresse */ }
    try {
      if (navigator.share) {
        await navigator.share({ url });
        setTeilenText("");
      } else {
        await navigator.clipboard.writeText(url);
        setTeilenText(T.linkKopiert);
        setTimeout(() => setTeilenText(""), 2500);
      }
    } catch { /* abgebrochen — keine Meldung, er hat sich bewusst dagegen entschieden */ }
    setTeilenBusy(false);
  };

  /**
   * DIE ADRESSE ZUM SICHERN — ein gewöhnlicher Link, kein JavaScript.
   *
   * Owner 09.08.2026 mit einem Bild seines iPhones: „Ich habe auf Download geklickt auf dem
   * Handy und dann öffnet sich das. Ich kann da nichts machen. Weder Fenster schliessen noch
   * Download." Der alte Weg holte die Datei erst per `fetch` und klickte danach einen
   * unsichtbaren Link — auf iOS ist die Fingerberührung nach dem `await` verbraucht, der
   * Klick verpufft, und der Notausgang landete auf der nackten Speicher-Adresse: ein
   * Videospieler ohne Ausgang.
   *
   * Jetzt zeigt der Knopf direkt auf `/api/download`, und die Route setzt
   * `Content-Disposition: attachment` — damit BIETET das Handy die Datei zum Sichern an,
   * statt sie zu öffnen. Kein Warten, keine verbrauchte Berührung, kein Notausgang.
   *
   * Der Speicherpfad steckt in der signierten Adresse (`/object/sign/<eimer>/<pfad>?token`);
   * ihn hier herauszuschneiden ist billiger, als ihn durch die halbe Galerie zu reichen.
   */
  const downloadHref = (it: Item): string => {
    const url = it.videoUrl || it.imageUrl;
    if (!url) return "";
    const m = url.match(/\/object\/(?:sign|public|authenticated)\/[^/]+\/(.+?)(?:\?|$)/);
    if (!m) return url;                        // fremde Adresse (Altbestand) — dann wie bisher
    const pfad = decodeURIComponent(m[1]);
    const basis = (it.lookName || "luxurybandit").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const name = `${basis}-${it.id}.${it.videoUrl ? "mp4" : "jpg"}`;
    return `/api/download?path=${encodeURIComponent(pfad)}&name=${encodeURIComponent(name)}`;
  };

  /** Das Datum in seiner Sprache — dieselben sieben Kürzel wie überall im Haus. */
  const DATUMS_LOCALE: Record<Lang, string> = { en: "en-US", de: "de-DE", ro: "ro-RO", es: "es-ES", fr: "fr-FR", pt: "pt-PT", it: "it-IT" };
  const datumWort = (iso: string): string => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(DATUMS_LOCALE[lang] ?? "en-US", { dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <main className="min-h-[100dvh] lb-bg pb-24 text-white">
      <TopNav />

      <div className="px-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-[22px] font-black">
            {T.galerieTitel} {items.length > 0 && <span className="text-white/70">{items.length}</span>}
          </h1>
          {pin && items.length > 0 && (
            <button type="button" onClick={() => { if (selectMode) clearSel(); else setSelectMode(true); }}
              className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-black transition ${selectMode ? "bg-white/85 text-black" : "bg-white/10 text-white/80"}`}>
              {selectMode ? "Fertig" : "Auswählen"}
            </button>
          )}
        </div>
        <p className="mt-0.5 text-[13px] font-semibold text-white/60">{T.galerieHinweis}{pin && " Toggle: Public = gratis Teaser im Chat, Private = 🔒 Abo."}</p>

        {/**
          * „ES LÄUFT NOCH" — GANZ OBEN, NICHT NUR AUF DER KACHEL (Owner 08.08.2026: „mich
          * nervt weil die galerie das rendering nicht zeigt … Es muss doch einen hinweis hin
          * das im hintergrund etwas noch rendert und bald in der galerie erscheint").
          *
          * Den Streifen auf der Kachel gab es schon — zwischen 28 Kacheln findet ihn keiner.
          * Diese Zeile steht ueber allem, sagt WIE VIELE laufen und dass er nichts tun muss.
          * Sie verschwindet von selbst: Die Seite laedt alle 15 s nach, solange etwas offen
          * ist (siehe `nachladen` oben) — der Kaeufer muss nie neu laden.
          */}
        {/**
          * DIE PROGRAMM-KARTE STAND HIER FRÜHER ALS EIGENE SONDERKARTE (11.08.2026, Auftrag
          * da11fe51: bezahlt 14:07, Programm-Datei 14:08, Video gescheitert — der Käufer sah
          * NICHTS, deshalb zuerst diese Extra-Karte über allem).
          *
          * OWNER 11.08.2026, NACHDEM ER SIE TROTZDEM ÜBERSAH: „Das habe ich komplett
          * übersehen … Muss in der Galerie stehen … da kannst du im Label schreiben statt
          * privat Programm. Und wenn ich drauf klicke auf das Bild dann öffnet sich das
          * programm." Eine Sonderkarte liest man wie ein Formularfeld, nicht wie ein Werk in
          * einem Album — die Galerie IST das Album. Das Programm steht jetzt als GANZ
          * NORMALE Kachel im Raster weiter unten (Item `type: "program"`), an seinem
          * chronologischen Platz, mit dem Standbild seiner Aufnahme statt eines Bildes.
          */}

        {/**
          * DER AVATAR STEHT ÜBER ALLEM (Owner 09.08.2026: „Auch in der Galerie. Das kann
          * später der User immer wieder benutzen … wenn er ein neues Video aufnimmt, dann
          * wird es ersetzt.").
          *
          * Er ist KEINE Kachel zwischen den Werken: Die Werke sind Ergebnisse, der Avatar
          * ist das Werkzeug. Deshalb steht er in einer eigenen Zeile ganz oben — klein,
          * mit dem Satz daneben, der beides sagt: wofür er da ist und dass eine neue
          * Aufnahme ihn ersetzt. Ohne diesen Satz wäre „Avatar" ein Wort, das der Kunde
          * zwar liest, aber nicht versteht.
          */}
        {avatar && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.04] p-2.5">
            <img src={avatar.imageUrl} alt={T.avatar}
              className="h-14 w-14 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0">
              <p className="text-[13px] font-black text-white">
                {T.avatar}
                {avatar.stimme && <span className="ml-1.5 text-[11px] font-bold text-[#f6cf51]">{T.avatarStimme}</span>}
              </p>
              <p className="mt-0.5 text-[11.5px] font-semibold leading-snug text-white/55">{T.avatarHinweis}</p>
            </div>
          </div>
        )}

        {items.some(x => x.rendert) && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[#f6cf51]/30 bg-[#f6cf51]/10 px-3 py-2.5">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#f6cf51]" />
            <p className="text-[12.5px] font-black leading-snug text-[#f6cf51]">
              {items.filter(x => x.rendert).length > 1
                ? T.laeuftViele.replace("{n}", String(items.filter(x => x.rendert).length))
                : T.laeuftEins}
              <span className="ml-1 font-semibold text-[#f6cf51]/75">{T.laeuftDazu}</span>
            </p>
          </div>
        )}

        {/* DER „TURN IT INTO A HOT VIDEO"-STREIFEN IST RAUS (Owner 03.08.2026: „das raus", mit
            einem Bild des Streifens).

            Er stammte vom 30.07. („dort machen wir Werbung noch für turn into Video") und warb
            mit „{once}, one-off" — dem 1,49-Einzelkauf, den der Kuss am 03.08. hinter sich
            gelassen hat: Bezahlt wird jetzt über zwei Aufladungen (4,99 / 9,99), das Einzel-
            Stripe kommt nie mehr. Der Streifen versprach damit einen Weg, den es nicht mehr
            gibt — und stand ausgerechnet über der Galerie, in der der Kunde das Ergebnis
            betrachtet, für das er schon bezahlt hat.

            AN SEINER STELLE EIN WEG, KEINE WERBUNG (Owner 03.08.2026: „‚Choose a topic‘
            vielleicht, aber nicht irgendein Banner. Dann springt er auf die Topics").

            Der Unterschied ist der Ton: Der Streifen vorher rief etwas aus und nannte einen
            Preis; das hier sagt nur, wohin es weitergeht. Es nennt KEINE Zahl — welches Thema
            was kostet, steht auf der Themenseite, und zwar aus `lib/pricing.ts`. Wer gerade
            sein fertiges Video ansieht, ist genau der, der ein zweites macht — er braucht
            keinen Anreiz, nur die Tür.

            UND ES IST KEINE ZEILE, SONDERN DIE THEMEN SELBST (Owner 03.08.2026: „das hast du
            aber lieblos jetzt gemacht" — zu einem grauen Kasten mit „Choose a topic" und einem
            Pfeil).

            Der graue Kasten war ein Schild, das auf eine Tür zeigt. Das hier IST die Tür: Jedes
            Thema steht als eigener Kreis da und springt direkt in seinen Trichter — ein Tipp
            statt zwei. „Choose a topic" ist nur noch die Überschrift darüber, und „Alle"
            am Ende führt für den Rest auf die Themenseite. */}
        {!pin && (
          <div className="mt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f6cf51]/80">Choose a topic</p>
            {/* Die Reihe selbst ist seit 06.08.2026 der Bibliotheks-Baustein `ThemenKreise`
                (Owner: „die kommen auch in die Bibliothek. Und scrollbalken wird dann
                transparent") — hier entstanden, jetzt aus components/CI.tsx geholt. */}
            <ThemenKreise className="mt-2.5" />
          </div>
        )}
        {/* NUR FUER DEN ADMIN (Owner 01.08.2026: „wozu die Suche wenn er nichts findet?").
            Der Kunde hat zwei Dutzend eigene Bilder — eine Model-Suche findet darin fast nie
            etwas und wirkt kaputt („Keine Treffer fuer Bella"). Der Admin hat Hunderte, fuer
            ihn bleibt sie. */}
        {pin && items.length > 0 && (
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Model suchen — z. B. Bella"
            className="mt-3 h-11 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[14px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-white/40" />
        )}
        {pin && items.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 text-[12px] font-black">
            {([["all", `Alle ${items.length}`], ["public", `Public ${pubCount}`], ["private", `Private ${items.length - pubCount}`]] as const).map(([k, lbl]) => (
              <button key={k} type="button" onClick={() => setStatusFilter(k)}
                className={`rounded-full px-3.5 py-1.5 transition ${statusFilter === k ? "bg-amber-500 text-white" : "bg-white/10 text-white/70"}`}>{lbl}</button>
            ))}
            <span className="w-px self-stretch bg-white/10" />
            {([["all", "Alle Typen"], ["video", `Videos ${vidCount}`], ["slide", `Slides ${items.length - vidCount}`]] as const).map(([k, lbl]) => (
              <button key={k} type="button" onClick={() => setTypeFilter(k)}
                className={`rounded-full px-3.5 py-1.5 transition ${typeFilter === k ? "bg-white/85 text-black" : "bg-white/10 text-white/70"}`}>{lbl}</button>
            ))}
            <span className="w-full" />
            {([["all", "Alle"], ["lingerie", `Lingerie ${catCount("lingerie")}`], ["normal", `Normal ${catCount("normal")}`], ["reise", `Reise ${catCount("reise")}`]] as const).map(([k, lbl]) => (
              <button key={k} type="button" onClick={() => setCatFilter(k)}
                className={`rounded-full px-3.5 py-1.5 transition ${catFilter === k ? "bg-violet-500 text-white" : "bg-white/10 text-white/70"}`}>{lbl}</button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="py-16 text-center text-[13px] font-bold text-white/40">Lädt…</p>
        ) : (!pin && !token && items.length === 0) ? (
          /**
           * NUR NOCH SPERREN, WENN WIRKLICH NICHTS DA IST (Owner 03.08.2026: „ich sehe das
           * Video nirgendwo" — nach einer BEZAHLTEN Erzeugung).
           *
           * Vorher sperrte diese Zeile JEDEN ohne Anmeldung/PIN aus — waehrend die Zahl im
           * Titel laengst „3" sagte: Die Stuecke waren ueber die GERAETEKENNUNG geladen und
           * zugeordnet, nur die Anzeige verweigerte sie. Wer zahlt und dann vor einer
           * Anmelde-Aufforderung steht, liest das als „Video weg". Die Kennung ist dieselbe
           * Zuordnung, mit der die Galerie seit je liest (Owner-Entscheidung „C": Geraet UND
           * Konto) — was ihm gehoert, sieht er. Anmelden lohnt weiterhin: nur damit folgt
           * die Galerie auf andere Geraete.
           */
          <p className="py-16 text-center text-[13px] font-bold text-white/50">Melde dich an, um deine Try-ons zu sehen.</p>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-[13px] font-bold text-white/40">{T.leer}</p>
        ) : shown.length === 0 ? (
          <p className="py-16 text-center text-[13px] font-bold text-white/40">Keine Treffer für „{query}".</p>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {shown.map(it => {
              const isSel = selected.has(it.id);
              return (
              <div key={it.id}
                onClick={() => {
                  if (selectMode) { toggleSel(it.id); return; }
                  /**
                   * DAS PROGRAMM ÖFFNET SICH DIREKT (Owner 11.08.2026: „Und wenn ich drauf
                   * klicke auf das Bild dann öffnet sich das programm"). Kein Vollbild-
                   * Zwischenschritt wie bei einem Video — ein Tipp, ein Ziel.
                   */
                  if (it.type === "program") { if (it.programUrl) window.location.href = it.programUrl; return; }
                  setOpen(it);
                }}
                className={`relative block aspect-[9/16] cursor-pointer overflow-hidden rounded-xl border bg-white/[0.04] active:opacity-80 ${isSel ? "border-amber-400 ring-2 ring-amber-400" : "border-white/10"}`}>
                {/**
                  * VIDEO OHNE VORSCHAUBILD → DAS VIDEO IST DIE KACHEL (Owner 03.08.2026:
                  * „ich sehe das Video nirgendwo", nach einem BEZAHLTEN Lauf).
                  *
                  * Seit der Kuss ohne Gratis-Bild laeuft, hat sein Eintrag kein `imagePath`
                  * mehr — nur `videoUrl`. Diese Kachel zeigte aber IMMER `<img>`: leere
                  * Adresse, schwarze Flaeche, winziges Play-Symbol. Sein bezahltes Video war
                  * technisch da und praktisch unsichtbar. `preload="metadata"` holt nur das
                  * erste Standbild, nicht den Film — nie schwarz, nichts laedt unnoetig
                  * (Hausregel aus der Feed-Spezifikation: nie ein schwarzer Kasten).
                  */}
                {it.type === "program" ? (
                  /**
                   * DAS KACHELBILD DES PROGRAMMS (Owner 12.08.2026: „im Programm soll das
                   * generierte video stehen" — bis hierher zeigte die Kachel selbst bei
                   * fertigem Future Film nur das Standbild der Aufnahme). Ist der Film fertig
                   * (`videoUrl` gesetzt), zeigt die Kachel IHN — genau wie jede andere
                   * Video-Kachel, `#t=0.1` als Poster (siehe Kommentar im Video-Zweig unten).
                   * Sonst bleibt es beim Standbild, sonst eine ruhige Fläche in Hausfarbe mit
                   * dem Wort (Owner 11.08.2026: fehlt beides, kein kaputtes Bildsymbol).
                   */
                  it.videoUrl ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={`${it.videoUrl}#t=0.1`} preload="metadata" muted playsInline
                      className="pointer-events-none h-full w-full object-cover object-top" />
                  ) : it.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.imageUrl} alt={T.programm} loading="lazy" className="h-full w-full object-cover object-top" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-[#1a160f] px-2 text-center text-[12px] font-black text-[#f6cf51]">
                      {T.programm}
                    </div>
                  )
                ) : !it.imageUrl && it.videoUrl ? (
                  /**
                   * `#t=0.1` IST DAS POSTER (Owner 03.08.2026: „das Video ist ohne Poster in
                   * der Galerie").
                   *
                   * `preload="metadata"` holt Laenge und Masse — aber KEIN Bild. Genau das
                   * hiess auf dem Schirm: schwarze Kachel mit Play-Dreieck. Das Zeitfragment
                   * sagt dem Browser, an welche Stelle er springen soll, und dann zeichnet er
                   * dieses eine Bild. Kostet ein paar Kilobyte statt eines eigenen
                   * Poster-Bildes, das erst irgendwer erzeugen muesste.
                   *
                   * `pointer-events-none`: Ein `<video>` schluckt auf dem Rechner den Klick,
                   * bevor er die Kachel erreicht — deshalb liess sich das Video „nicht
                   * vergroessern". Das Element ist hier reine Anzeige; geklickt wird die
                   * Kachel darunter.
                   */
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video src={`${it.videoUrl}#t=0.1`} preload="metadata" muted playsInline
                    className="pointer-events-none h-full w-full object-cover object-top" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imageUrl} alt={it.lookName ?? ""} loading="lazy" className="h-full w-full object-cover object-top" />
                )}
                {/* WARNZEICHEN — links oben, damit es nicht mit dem Auswahl-Haekchen rechts
                    kollidiert. Rot hinterlegt statt nur als Symbol: Ein Emoji auf einem
                    bunten Foto uebersieht man, und genau diese Kacheln soll man finden. */}
                {it.warnung && (
                  <span title={WARN_TEXT[it.warnung] ?? it.warnung}
                    className="pointer-events-none absolute left-1 top-1 z-10 flex items-center gap-1 rounded-full bg-red-600/90 px-1.5 py-0.5 text-[10px] font-black text-white shadow">
                    {WARN_ZEICHEN[it.warnung] ?? "⚠️"}
                    {it.alter ? <span>~{it.alter}</span> : null}
                  </span>
                )}
                {/* Auswahl-Häkchen (Videos UND Slides). */}
                {selectMode && (
                  <span className={`absolute right-1 top-1 z-10 grid h-5 w-5 place-items-center rounded-full text-[11px] font-black ${isSel ? "bg-amber-400 text-black" : "bg-black/60 text-white ring-1 ring-white/60"}`}>{isSel ? "✓" : ""}</span>
                )}
                {/* IN ARBEIT (Owner 08.08.2026: „damit der user es weiss"): der Streifen
                    sagt, dass hier gerade gerendert wird — Kreisel nie ohne Wort (CI). */}
                {it.rendert && (
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-1.5 bg-black/70 px-1 py-1.5 text-[10px] font-black text-[#f6cf51]">
                    <Loader2 className="h-3 w-3 animate-spin" /> {T.entsteht}
                  </span>
                )}
                {/* NOCH KEIN BILD, ABER SCHON BEZAHLT: die Kachel bleibt trotzdem stehen
                    (siehe Filter oben) — hier bekommt sie einen Grund, angesehen zu werden. */}
                {it.rendert && !it.imageUrl && !it.videoUrl && (
                  <span className="pointer-events-none absolute inset-0 grid place-items-center bg-white/[0.06] text-[26px]">🎬</span>
                )}
                {it.videoUrl && (
                  <span className="pointer-events-none absolute inset-0 grid place-items-center text-white/90">
                    <Play className="h-7 w-7 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]" fill="currentColor" />
                  </span>
                )}
                {/* LÖSCHEN FÜR DEN BESITZER (Owner 30.07.2026: „muss es auch löschen können
                    hier"). Nur an eigenen Kiss-Stücken; der Sammel-Löscher oben bleibt Admin.
                    Klick geht NICHT an die Kachel weiter, sonst öffnet sich das Vollbild. */}
                {/* AUCH MIT ADMIN-AUSWEIS (Owner 12.08.2026: „was mich nervt, dass ich nichts
                    löschen kann in der galerie"). Hier stand zusätzlich `!pin` — auf einem
                    Gerät mit Admin-Ausweis verschwand damit JEDER Löschknopf, und der
                    Sammel-Löscher des Admins kennt nur Try-on-Generierungen und Slides, keine
                    Kiss-Einträge: Auf so einem Gerät war in der Galerie NICHTS löschbar. Die
                    Route prüft den Besitz ohnehin selbst (Admin darf immer). */}
                {/* NUR AN DER HAUPT-KACHEL (Owner 12.08.2026: „ich habe ein anderes bild
                    geloscht und waren 3 jetzt weg — inklusive das video"). Die drei Kacheln
                    eines Auftrags (Werk + ihr Bild + sein Foto) hängen an EINEM Eintrag; der
                    Knopf an einer Beiwerk-Kachel löschte den ganzen Auftrag samt bezahltem
                    Video. Beiwerk (`kiss-model`/`kiss-upload`) hat keinen Löschknopf mehr —
                    gelöscht wird am WERK, und dann verschwinden alle drei erwartbar. */}
                {/* Und an der PROGRAMM-Kachel (12.08.2026, „ein Kauf, eine Kachel"): seit die
                    doppelte Video-Kachel des Versprechens entfällt, ist sie die einzige
                    Kachel des Kaufs — ohne Knopf hier wäre der Auftrag unlöschbar. */}
                {!selectMode && (it.source === "kiss" || it.type === "program") && (
                  <button type="button"
                    onClick={e => { e.stopPropagation(); void eigenesLoeschen(it); }}
                    aria-label={loeschScharf === it.id ? T.loeschenSicher : T.loeschen}
                    /* Rot IST die Rückfrage. Etwas größer, damit der zweite Tipp nicht danebengeht. */
                    className={`absolute bottom-1 right-1 z-10 grid place-items-center rounded-full text-white backdrop-blur active:scale-90 transition ${
                      loeschScharf === it.id ? "h-9 w-9 bg-red-600 ring-2 ring-white/70" : "h-7 w-7 bg-black/65"}`}>
                    <Trash2 className={loeschScharf === it.id ? "h-4 w-4" : "h-3.5 w-3.5"} />
                  </button>
                )}
                {/**
                  * DAS „PRIVATE"-SCHILD (Owner 11.08.2026: „ok überall steht private, das
                  * brauche ich nicht" — an genau dieser Marke, in seiner eigenen Galerie).
                  *
                  * Für ihn als Kunden ist „privat" der Normalzustand jedes Stücks hier — ein
                  * Schild, das das immer wiederholt, sagt nichts Neues. Der Admin dagegen hat
                  * DIREKT DARUNTER den Umschalter (`→ Privat 🔒` / `→ Public ✓`); für ihn bleibt
                  * das Schild, weil es zu einer echten Funktion gehört (Punkt 1: „wenn ja,
                  * Funktion behalten, nur die Dauer-Beschriftung entfernen" — hier ist beides
                  * dasselbe Wort, deshalb bleibt es stehen, aber NUR beim Admin).
                  * Die Programm-Kachel hat kein Public/Private — sie zeigt stattdessen, WAS sie
                  * ist (Owner: „da kannst du im Label schreiben statt privat Programm").
                  */}
                {it.type === "program" ? (
                  <span className="absolute left-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[8px] font-black text-white backdrop-blur">
                    {T.programm}
                  </span>
                ) : pin ? (
                  <span className={`absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[8px] font-black backdrop-blur ${it.public ? "bg-amber-500 text-white" : it.feed ? "bg-amber-400 text-black" : "bg-black/70 text-white"}`}>
                    {it.public ? "Public" : it.feed ? "Show" : "Private"}
                  </span>
                ) : themaWort(lang, it.theme || "") ? (
                  /* JEDE KACHEL SAGT, WAS SIE IST (Owner 12.08.2026: „und Geburtagsvideo hat
                     kein Label"). Beim „Private"-Umbau bekam nur das Programm ein Schild —
                     Geburtstag/Kuss/Hochzeit standen nackt da. Dasselbe Schild, dasselbe
                     Design; bei unbekanntem Thema KEIN Schild statt eines geratenen. */
                  <span className="absolute left-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[8px] font-black text-white backdrop-blur">
                    {themaWort(lang, it.theme || "")}
                  </span>
                ) : null}
                {/* Typ-Tag: Card-Slide (Urlaub/Peter) unterscheiden. Im Auswahl-Modus weg (Häkchen). */}
                {it.type === "slide" && !selectMode && (
                  <span className="absolute right-1 top-1 rounded-full bg-white/85 px-1.5 py-0.5 text-[8px] font-black text-black backdrop-blur">Slide</span>
                )}
                {/* Kategorie-Tag (Lingerie) als kleiner Hinweis. */}
                {catOf(it) === "lingerie" && !selectMode && (
                  <span className="absolute left-1 bottom-1 rounded-full bg-violet-500/90 px-1.5 py-0.5 text-[8px] font-black text-white backdrop-blur">Lingerie</span>
                )}
                {/* Admin: 1-Klick Public ↔ Private — nur bei VIDEOS, außerhalb des Auswahl-Modus. */}
                {pin && !selectMode && it.type !== "slide" && it.type !== "program" && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); void setPublic(it, !it.public); }}
                    className={`absolute inset-x-1 bottom-6 rounded-full py-1 text-[9px] font-black backdrop-blur active:scale-95 transition ${it.public ? "bg-black/70 text-white" : "bg-amber-500 text-white"}`}>
                    {it.public ? "→ Privat 🔒" : "→ Public ✓"}
                  </button>
                )}
                {pin && !selectMode && it.type === "slide" && (
                  <span className="pointer-events-none absolute inset-x-1 bottom-1 rounded-full bg-black/60 py-1 text-center text-[8px] font-black text-white/80 backdrop-blur">Im Card Studio</span>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk-Aktionsleiste (Auswahl-Modus) — verschieben (Lingerie/Normal), Freigabe, Löschen. */}
      {selectMode && selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[110] border-t border-white/10 bg-[#0d0b0a]/95 px-3 py-3 backdrop-blur">
          <div className="mb-2 text-center text-[12px] font-black text-white/70">{selected.size} ausgewählt</div>
          <div className="flex flex-wrap justify-center gap-2 text-[12px] font-black">
            <button type="button" onClick={() => void bulkGarment("lingerie")} className="rounded-full bg-violet-500 px-3.5 py-2 text-white active:scale-95">→ Lingerie</button>
            <button type="button" onClick={() => void bulkGarment("normal")} className="rounded-full bg-white/15 px-3.5 py-2 text-white active:scale-95">→ Normal</button>
            <button type="button" onClick={() => void bulkPublic(true)} className="rounded-full bg-amber-500 px-3.5 py-2 text-white active:scale-95">Public</button>
            <button type="button" onClick={() => void bulkPublic(false)} className="rounded-full bg-white/15 px-3.5 py-2 text-white active:scale-95">Private</button>
            <button type="button" onClick={() => void bulkDelete()} className="rounded-full bg-red-500/90 px-3.5 py-2 text-white active:scale-95">Löschen</button>
          </div>
        </div>
      )}

      {/* Vollbild-Ansicht mit Download */}
      {open && (
        /**
         * IN DER HANDY-SPALTE, NICHT ueber den ganzen Bildschirm (Owner 03.08.2026: „mach
         * bitte mobile Format, du hast jetzt Desktop").
         *
         * Diese App ist eine 440-px-Spalte (`.lb-frame`) — auch am Rechner. Ein `fixed
         * inset-0` kennt diese Spalte aber nicht: Es haengt am Fenster und spannte sich ueber
         * die ganze Breite, mit „Teilen" und „Download" an den aeusseren Ecken, waehrend die
         * Karte einsam in der Mitte stand. `lb-phone-col` ist die vorhandene Antwort darauf
         * (globals.css) und wird schon von den Overlays im Try-on und im Profil benutzt:
         * Sie zieht ein fest positioniertes Element in dieselbe Spalte wie den Rest.
         * Auf dem Handy aendert sie nichts — die Regel gilt erst ab 480 px.
         */
        <div className="lb-phone-col fixed inset-0 z-[120] flex flex-col bg-black/95" onClick={() => setOpen(null)}>
          <div className="flex items-center justify-between p-3">
            <button type="button" onClick={() => setOpen(null)}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white active:scale-95">
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              {/**
                * TEILEN AUCH VOM RECHNER (Owner 03.08.2026: „ich kann es nicht sharen. Ich will
                * das auch vom Rechner dann den Link schicken").
                *
                * Auf dem Handy oeffnet `navigator.share` das Systemmenue (WhatsApp, Mail …).
                * Auf dem Rechner gibt es das fast nirgends — dort wird der Link in die
                * Zwischenablage gelegt und der Knopf sagt „kopiert". Beides fuehrt zum selben
                * Ziel: der Werk-Seite /w/<id>, die den Kuss in der Karte zeigt.
                *
                * Der Link wird VORHER freigeschaltet (`share`), denn die Werk-Seite ist privat,
                * bis der Besitzer ausdruecklich teilt. Ohne diesen Schritt bekaeme der
                * Empfaenger „Diese Karte ist privat" — ein toter Link, verschickt in gutem
                * Glauben.
                */}
              {/* DER TEILEN-KNOPF STAND HIER — jetzt sitzt er AUF DER KARTE (Owner 03.08.2026:
                  „und die haben kein Share-Button auf der Karte").
                  Beides nebeneinander waere zweimal derselbe Knopf fuer dieselbe Sache, einmal
                  im Werkzeugbalken und einmal am Werk — genau die Doppelung, die uns beim
                  zweiten Video-Spieler schon passiert ist. Die Karte ist das, was verschickt
                  wird; der Knopf gehoert dorthin. Bei einem BILD (kein Video, keine Karte)
                  bleibt der Download-Knopf hier der einzige Weg — geteilt werden nur Werke.
                  Die Funktion `teilen` ist unveraendert; nur ihr Knopf ist umgezogen. */}
              <a href={downloadHref(open)} download onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 rounded-full bg-[#f6cf51] px-4 py-2 text-[13px] font-black text-black active:scale-95">
                <Download className="h-4 w-4" /> {T.download}
              </a>
            </div>
          </div>
          {/**
            * DIE DATENZEILE (Owner 11.08.2026: „stehen auch keine Daten, wann ich das
            * aufgenommen habe für was. Oder generiert wann, gekauft für wieviel, Wie lang das
            * video ist. Ist das eine Programm, eine geburtstagskarte..."). WAS es ist (Thema +
            * Medium in Worten), WANN aufgenommen, WANN fertig (nur wenn bekannt), WAS bezahlt
            * (nur wenn wirklich bezahlt — nie ein getippter Betrag, siehe `geschenkPreisCents`
            * in /api/my-videos), WIE LANG (nur bei Video, aus dem Spieler selbst).
            *
            * NIE EIN GERATENES THEMA (Owner 11.08.2026, am echten Befund: ein Eintrag ohne
            * Thema zeigte „Kiss video" — „das ist ein Bild und wurde bestimmt für einen
            * anderen Zweck gemacht"). Hier stand `themaLabel(lang, open.theme || "kiss")` —
            * ein Rückfall auf "kiss", der bei leerem Thema eine Behauptung erfand, UND ein
            * Text, der "video" fest eingebacken hatte, selbst wenn der Eintrag nur ein Bild
            * ist. `themaUndMedium` rät nichts: fehlt das Thema, steht nur "Image"/"Video" da
            * — nie ein falsches Thema, nie das falsche Medium.
            */}
          <div className="px-3 pb-2 text-center text-[11.5px] font-semibold leading-snug text-white/60" onClick={(e) => e.stopPropagation()}>
            {themaUndMedium(lang, open.theme || "", !!open.videoUrl)}
            {!!open.createdAt && <> · {T.aufgenommen} {datumWort(open.createdAt)}</>}
            {!!open.videoFertigAt && <> · {T.fertig} {datumWort(open.videoFertigAt)}</>}
            {open.paid && !!open.preisCents && <> · {T.bezahlt} {eur(open.preisCents, lang)}</>}
            {!!open.videoUrl && !!offenDauer && <> · {offenDauer}</>}
          </div>
          {/* Miss die Länge, ohne das eigentliche Video zu laden — unsichtbar, nur der Kopf
              der Datei (siehe Kommentar bei `offenDauer`). */}
          {!!open.videoUrl && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={open.videoUrl} preload="metadata" muted className="hidden"
              onLoadedMetadata={e => {
                const s = e.currentTarget.duration;
                if (Number.isFinite(s)) setOffenDauer(`${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`);
              }} />
          )}
          <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto p-3" onClick={(e) => e.stopPropagation()}>
            {/**
              * DIE KARTE, NICHT DIE VIDEODATEI (Owner 03.08.2026: „ich will nicht das Video
              * teilen, sondern die Karte. Also muss beim Klick die Karte mit Musik und
              * Herzchen kommen — die werde ich sharen").
              *
              * Hier stand ein nackter Spieler. Der zeigt zwar dasselbe Video, aber nicht das
              * GESCHENK: keine Karte, keine aufsteigenden Zeilen, keine Musik. Wer vor dem
              * Verschicken nur den nackten Film sieht, weiss nicht, was beim Empfaenger
              * ankommt — und genau das soll er hier pruefen koennen.
              *
              * Dieselben Bausteine wie `/w/<id>` (WerkAnsicht): EinladungKarte + der
              * Ansichts-Baustein mit Ton + Reaktionen. Was er hier sieht, ist Zeile fuer
              * Zeile das, was der Link zeigt — samt Musik von selbst (Owner 03.08.2026: „die
              * Musik soll automatisch an sein"). Sie laeuft erst, wenn er eine Kachel
              * ANTIPPT, nie beim Blaettern: Das Vollbild oeffnet sich auf seinen Klick hin,
              * und genau diese Geste braucht der Browser ohnehin, um Ton zuzulassen.
              */}
            {open.videoUrl ? (
              <div className="w-full max-w-[420px]">
                <EinladungKarte sprache="en" sie="" er="" demo
                  /**
                   * DIE ÜBERSCHRIFT GEHÖRT ZUM THEMA (Owner 03.08.2026, mit einem Bild einer
                   * Geburtstagskarte, auf der „UNFORGETTABLE KISS GIFT" stand).
                   *
                   * Hier standen drei Fälle und ein Sammelbecken: alles, was nicht Hochzeit
                   * oder Idol war, hieß „Kiss gift" — also auch jedes Geburtstags-, Tanz- und
                   * Urlaubsvideo. Auf einem Geschenk an einen bestimmten Menschen steht damit
                   * der Name eines fremden Produkts.
                   *
                   * Beim Geburtstag steht der Gruß selbst oben, wörtlich wie im Trichter
                   * (`geburtstagTitel`) — „Happy birthday to you Geza". Das Geburtstagskind
                   * bekommt kein Produkt, es bekommt einen Gruß.
                   */
                  titel={
                    open.theme === "wedding" ? "The Wedding"
                      : open.theme === "idol" ? "Your Idol"
                      : open.theme === "birthday" ? geburtstagTitel(open.empfaenger || "")
                      : open.theme === "poledance" ? "Your dance"
                      : open.theme === "holiday" ? "Your holiday"
                      : "Unforgettable kiss gift"}
                  fuss={
                    <p className="lb-karte-gold mt-3 text-center text-[9px] font-bold uppercase tracking-[0.22em] opacity-70">
                      erstellt durch luxurybandit.com
                    </p>
                  }
                  video={
                    <div className="relative">
                      {/* KEINE MUSIK UEBER DER STIMME (Owner 08.08.2026: „startet die musik
                          statt die original stimme"). Beim Geburtstag IST die Stimme das
                          Produkt — liefert die Themen-Tabelle kein Stueck (""), spielt der
                          Originalton, ohne Schleife (lib/musik: birthday = ""). */}
                      {/* DAS POSTER REIST MIT (Owner 08.08.2026, mit Bild: „und das poster fehlt"):
                          es LAG im Auftrag — die Ansicht hat es nur nicht an den Spieler
                          gereicht, und bis zum ersten Tipp stand eine braune Flaeche. */}
                      <EinladungAnsicht id="" videoUrl={open.videoUrl} poster={open.imageUrl || undefined} zaehlen={false}
                        {...(musikFuer(open.theme || "kiss")
                          ? { musik: musikFuer(open.theme || "kiss"), tonAutomatisch: true }
                          : { originalton: true, schleife: false, musik: "" })}
                        tonText={KARTE_TEXTE.en.ton} tonAusText={KARTE_TEXTE.en.tonAus}
                        /**
                         * TEILEN GEHÖRT AUF DIE KARTE, AN IHREN FESTEN PLATZ (Owner 03.08.2026:
                         * „und die haben kein Share-Button auf der Karte"; Owner 11.08.2026:
                         * „wieso hat ein anderes design als sound?" — der Knopf sass hier
                         * bislang FEST auf `left-2 top-2`, von Hand nachgebaut, statt über
                         * dieses Prop zu gehen. Damit sass er LINKS (die Regel verlangt rechts,
                         * Platz 2 nach Vergrössern) und sah anders aus als der Ton-Knopf
                         * darunter — zwei Handarbeiten für dasselbe Symbol laufen garantiert
                         * auseinander (Skill `card`: „Wer einen der drei Knöpfe selbst
                         * irgendwo hinsetzt, baut den alten Fehler von neuem ein").
                         *
                         * Jetzt reicht dieser Aufrufer nur noch, WAS geteilt wird — Platz
                         * (`right-3`, zweite Stelle nach Vergrössern), Grösse und die 30 %
                         * Durchsicht setzt `EinladungAnsicht` selbst, genau wie beim Ton-Knopf
                         * daneben. Die Freischalt-Logik (`teilen(open)`) ist unverändert.
                         */
                        teilen={
                          <>
                            <button type="button" disabled={teilenBusy}
                              onClick={e => { e.stopPropagation(); void teilen(open); }}
                              aria-label={T.teilen}
                              style={{ background: "#fff", color: "#1a160f", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
                              className="grid h-10 w-10 place-items-center rounded-full transition active:scale-90 disabled:opacity-50">
                              {teilenBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                            </button>
                            {!!teilenText && (
                              <span className="mt-1 block whitespace-nowrap rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">
                                {teilenText}
                              </span>
                            )}
                          </>
                        } />
                      <Reaktionen variant={open.theme || "kiss"} lang="en" name={open.empfaenger || ""} />
                    </div>
                  } />
                {/**
                  * DER PROGRAMM-KNOPF IN DER GALERIE (11.08.2026, Owner: „wo ist der link
                  * zum plan?" — bisher nur in der Liefermail). Derselbe Knopf-Stil wie der
                  * Download unter dem fertigen Video im Trichter (`lb-gold`), nicht neu
                  * erfunden. `open.programUrl` kommt fertig aus /api/my-videos
                  * (`futureProgramUrl`) — leer, wenn die Programm-Datei nicht existiert oder
                  * das Server-Geheimnis fehlt; dann bleibt der Knopf einfach weg.
                  */}
                {/* AUS DER BIBLIOTHEK (Owner 12.08.2026: „seit wann haben wir weisse schrift
                    in Buttons?") — hier stand ein nachgebautes `<a class="lb-gold">`, dessen
                    Tinte der Kontext überschreiben konnte. `Knopf href` trägt sie fest. */}
                {open.theme === "versprechen" && !!open.programUrl && (
                  <Knopf href={open.programUrl} className="mt-3">
                    {kissText(lang, "versprechen").programmKnopf}
                  </Knopf>
                )}
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={open.imageUrl} alt={open.lookName ?? ""} className="max-h-full max-w-full rounded-2xl object-contain" />
            )}
          </div>
        </div>
      )}
    </main>
  );
}
