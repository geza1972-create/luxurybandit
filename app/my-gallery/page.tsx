"use client";

import { useEffect, useState } from "react";
import { Play, Download, X, Loader2, Trash2, Send } from "lucide-react";
import { ThemenKreise } from "@/components/CI";
import TopNav from "@/components/TopNav";
import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import Reaktionen from "@/components/Reaktionen";
import { musikFuer } from "@/lib/musik";
import { geburtstagTitel } from "@/lib/geburtstag";
import { aktiveAdresse } from "@/lib/guthaben-konto";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

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
  type?: "video" | "slide";   // Try-on-Video vs. Card-Studio-Slide (Urlaub/Peter-Fotos)
  imageUrl: string;
  videoUrl?: string;
  lookName?: string;
  curatorId?: string;
  curatorName?: string;
  garment?: string;   // manuell zugewiesen: "lingerie" | "normal"
  source?: string;    // "kiss" | "kiss-upload" — nur die darf der Besitzer selbst löschen
  theme?: string;     // fuer die Karten-Vorschau: kiss | wedding | idol
  empfaenger?: string; // der Name, der in den aufsteigenden Zeilen steht
  /**
   * URTEIL DER ALTERS- UND NACKTHEITSPRÜFUNG (Owner 31.07.2026: „du machst mir aber in der
   * Galerie ein Warnzeichen drauf"). Nur gesetzt, wenn etwas auffiel — im Beobachten-Modus
   * geht der Upload durch UND traegt das Zeichen.
   */
  warnung?: string;
  alter?: number;
  feed?: boolean;
  public?: boolean;
};

export default function MyGalleryPage() {
  const [pin, setPin] = useState("");
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Item | null>(null);
  const [downloading, setDownloading] = useState(false);
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
    const id = it.id.replace(/-foto$/, "");
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
        alert(d?.error === "Not yours."
          ? "Dieses Stück gehört zu einer anderen Adresse oder einem anderen Gerät. Melde dich mit der Adresse an, mit der du es erzeugt hast."
          : (d?.error || "Löschen hat nicht geklappt. Bitte noch einmal versuchen."));
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
      alert("Keine Verbindung. Bitte noch einmal versuchen.");
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
  useEffect(() => {
    if (!ready) return;
    // EIGENE VIDEOS (Chat/Try-on ohne Konto): haengen am Geraet — und zusaetzlich an der
    // E-Mail, sobald er angemeldet ist (Owner 28.07.2026). Laeuft unabhaengig vom Admin-Weg.
    const device = (() => { try { return localStorage.getItem("lb_visitor") ?? ""; } catch { return ""; } })();
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
    if (device || mail) {
      fetch(`/api/my-videos?device=${encodeURIComponent(device)}&email=${encodeURIComponent(mail)}`, { cache: "no-store" })
        .then(r => r.json())
        .then(d => {
          const own: Item[] = (Array.isArray(d?.videos) ? d.videos : []).map((v: { id: string; videoUrl: string; posterUrl?: string; name?: string }) => ({
            id: v.id, type: "video" as const, imageUrl: v.posterUrl || "", videoUrl: v.videoUrl, lookName: v.name || "",
          }));
          // DIE KISS-BILDER GEHÖREN HIER HIN (Owner 30.07.2026: „seine Galerie ist leer,
          // seine Bilder sind nicht da"). Sie liegen im Kiss-Log; die Route liefert sie jetzt
          // als `pictures` mit — zugeordnet über E-Mail oder Gerät.
          const bilder: Item[] = (Array.isArray(d?.pictures) ? d.pictures : [])
            .map((b: { id: string; imageUrl?: string; videoUrl?: string; name?: string; source?: string; warnung?: string; alter?: number; theme?: string; empfaenger?: string }) => ({
              id: b.id,
              type: (b.videoUrl ? "video" : "image") as "video" | "image",
              imageUrl: b.imageUrl || "",
              videoUrl: b.videoUrl || "",
              lookName: b.name || "",
              source: b.source || "kiss",
              theme: b.theme || "kiss",
              empfaenger: b.empfaenger || "",
              warnung: b.warnung || "",
              alter: b.alter || 0,
            }))
            .filter((b: Item) => b.imageUrl || b.videoUrl);
          own.push(...bilder);
          if (own.length) setItems(prev => [...own, ...prev.filter(x => !own.some(o => o.id === x.id))]);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
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
  }, [ready, pin, token]);

  // Cross-origin (Supabase) → per Blob laden, damit der Browser wirklich SPEICHERT
  // statt nur zu öffnen. Fällt auf „in neuem Tab öffnen" zurück, falls CORS blockt.
  /** Teilen-Rueckmeldung: „kopiert" statt eines stummen Knopfs. */
  const [teilenBusy, setTeilenBusy] = useState(false);
  const [teilenText, setTeilenText] = useState("");

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
        setTeilenText("Link kopiert");
        setTimeout(() => setTeilenText(""), 2500);
      }
    } catch { /* abgebrochen — keine Meldung, er hat sich bewusst dagegen entschieden */ }
    setTeilenBusy(false);
  };

  const download = async (it: Item) => {
    const url = it.videoUrl || it.imageUrl;
    if (!url) return;
    setDownloading(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = obj;
      const base = (it.lookName || "luxurybandit").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      a.download = `${base}-${it.id}.${it.videoUrl ? "mp4" : "jpg"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(obj), 4000);
    } catch {
      window.open(url, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] lb-bg pb-24 text-white">
      <TopNav />

      <div className="px-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-[22px] font-black">
            My Gallery {items.length > 0 && <span className="text-white/70">{items.length}</span>}
          </h1>
          {pin && items.length > 0 && (
            <button type="button" onClick={() => { if (selectMode) clearSel(); else setSelectMode(true); }}
              className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-black transition ${selectMode ? "bg-white/85 text-black" : "bg-white/10 text-white/80"}`}>
              {selectMode ? "Fertig" : "Auswählen"}
            </button>
          )}
        </div>
        <p className="mt-0.5 text-[13px] font-semibold text-white/60">Tippe ein Video an — Vollbild und Download.{pin && " Toggle: Public = gratis Teaser im Chat, Private = 🔒 Abo."}</p>

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
          <p className="py-16 text-center text-[13px] font-bold text-white/40">Noch nichts hier — mach dein erstes Bild.</p>
        ) : shown.length === 0 ? (
          <p className="py-16 text-center text-[13px] font-bold text-white/40">Keine Treffer für „{query}".</p>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {shown.map(it => {
              const isSel = selected.has(it.id);
              return (
              <div key={it.id} onClick={() => selectMode ? toggleSel(it.id) : setOpen(it)}
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
                {!it.imageUrl && it.videoUrl ? (
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
                {it.videoUrl && (
                  <span className="pointer-events-none absolute inset-0 grid place-items-center text-white/90">
                    <Play className="h-7 w-7 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]" fill="currentColor" />
                  </span>
                )}
                {/* LÖSCHEN FÜR DEN BESITZER (Owner 30.07.2026: „muss es auch löschen können
                    hier"). Nur an eigenen Kiss-Stücken; der Sammel-Löscher oben bleibt Admin.
                    Klick geht NICHT an die Kachel weiter, sonst öffnet sich das Vollbild. */}
                {!pin && !selectMode && String(it.source ?? "").startsWith("kiss") && (
                  <button type="button"
                    onClick={e => { e.stopPropagation(); void eigenesLoeschen(it); }}
                    aria-label={loeschScharf === it.id ? "Wirklich löschen — nochmal tippen" : "Löschen"}
                    /* Rot IST die Rückfrage. Etwas größer, damit der zweite Tipp nicht danebengeht. */
                    className={`absolute bottom-1 right-1 z-10 grid place-items-center rounded-full text-white backdrop-blur active:scale-90 transition ${
                      loeschScharf === it.id ? "h-9 w-9 bg-red-600 ring-2 ring-white/70" : "h-7 w-7 bg-black/65"}`}>
                    <Trash2 className={loeschScharf === it.id ? "h-4 w-4" : "h-3.5 w-3.5"} />
                  </button>
                )}
                <span className={`absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[8px] font-black backdrop-blur ${it.public ? "bg-amber-500 text-white" : it.feed ? "bg-amber-400 text-black" : "bg-black/70 text-white"}`}>
                  {it.public ? "Public" : it.feed ? "Show" : "Private"}
                </span>
                {/* Typ-Tag: Card-Slide (Urlaub/Peter) unterscheiden. Im Auswahl-Modus weg (Häkchen). */}
                {it.type === "slide" && !selectMode && (
                  <span className="absolute right-1 top-1 rounded-full bg-white/85 px-1.5 py-0.5 text-[8px] font-black text-black backdrop-blur">Slide</span>
                )}
                {/* Kategorie-Tag (Lingerie) als kleiner Hinweis. */}
                {catOf(it) === "lingerie" && !selectMode && (
                  <span className="absolute left-1 bottom-1 rounded-full bg-violet-500/90 px-1.5 py-0.5 text-[8px] font-black text-white backdrop-blur">Lingerie</span>
                )}
                {/* Admin: 1-Klick Public ↔ Private — nur bei VIDEOS, außerhalb des Auswahl-Modus. */}
                {pin && !selectMode && it.type !== "slide" && (
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
              <button type="button" onClick={(e) => { e.stopPropagation(); void download(open); }} disabled={downloading}
                className="flex items-center gap-2 rounded-full bg-[#f6cf51] px-4 py-2 text-[13px] font-black text-black active:scale-95 disabled:opacity-50">
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download
              </button>
            </div>
          </div>
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
                      <EinladungAnsicht id="" videoUrl={open.videoUrl} zaehlen={false}
                        musik={musikFuer(open.theme || "kiss")} tonAutomatisch
                        tonText={KARTE_TEXTE.en.ton} tonAusText={KARTE_TEXTE.en.tonAus} />
                      <Reaktionen variant={open.theme || "kiss"} lang="en" name={open.empfaenger || ""} />
                      {/**
                        * TEILEN GEHÖRT AUF DIE KARTE (Owner 03.08.2026: „und die haben kein
                        * Share-Button auf der Karte").
                        *
                        * Es gab einen — im schwarzen Kopfbalken darüber, zwischen „X" und
                        * „Download", wo er über der Seitenkopfzeile klebt. Die Karte IST aber
                        * das, was verschickt wird; der Knopf dafür gehört darauf, nicht in die
                        * Werkzeugleiste eines Betrachters. Genau so steht es in
                        * `Landingpage.md` und so macht es die Beispiel-Galerie: links oben,
                        * gegenüber dem Ton-Knopf, auf z-30.
                        *
                        * Derselbe Aufruf wie oben (`teilen`) — erst freischalten, dann den
                        * /w/<id>-Link verschicken, nie umgekehrt.
                        */}
                      <button type="button" disabled={teilenBusy}
                        onClick={e => { e.stopPropagation(); void teilen(open); }}
                        aria-label="Teilen"
                        /**
                         * WEISSE SCHEIBE, GOLDENER PFEIL — GENAU WIE BEIM TANZ (Owner
                         * 03.08.2026: „nein, der Kreis war weiss und das Icon gold" · „etwas wie
                         * der Sound" · „wie bei Poledance").
                         *
                         * Zwei Fehlversuche davor, und beide aus demselben Grund: Ich habe die
                         * Farbe selbst bestimmt, statt die Rezeptur zu nehmen, die auf den
                         * Tanz-Karten schon steht. Erst eine dunkle Scheibe mit goldenem Pfeil
                         * (weil `.lb-karte svg` jedes Symbol auf Gold zieht), dann eine dunkle
                         * Scheibe mit weissem Pfeil — und daneben sass unveraendert der
                         * Elfenbein-Ton-Knopf. Zwei Gestaltungen fuer dieselbe Sorte Bedienung,
                         * auf derselben Karte, nebeneinander.
                         *
                         * DIE VORLAGE IST `TeilenKnopf` mit `rund` (BeispielGalerie, Tanz):
                         * weisser Grund per `style`, und `.lb-karte svg` macht den Pfeil von
                         * selbst golden. Kein `data-aufmedien` — das waere Weiss auf Weiss.
                         * Der Hintergrund darf hier per `style` kommen: Die !important-Regeln
                         * der Karte treffen `color`/`stroke`, nicht `background`.
                         */
                        style={{ background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
                        className="absolute left-2 top-2 z-30 grid h-10 w-10 place-items-center rounded-full transition active:scale-90 disabled:opacity-50">
                        {/* h-5 wie in `TeilenKnopf`, nicht h-4 — sonst sitzt ein kleinerer
                            Pfeil in derselben Scheibe wie der Ton-Knopf gegenueber. */}
                        {teilenBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                      </button>
                      {!!teilenText && (
                        <span className="absolute left-2 top-14 z-30 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">
                          {teilenText}
                        </span>
                      )}
                    </div>
                  } />
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
