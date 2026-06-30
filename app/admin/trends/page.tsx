"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Check, ChevronUp, ChevronDown, ClipboardPaste, Crop, ExternalLink, ImagePlus, Link2, Loader2, Lock, Pencil, Plus, Search, Trash2, Upload, Video, Wand2, X } from "lucide-react";
import { FASHION_BRANDS } from "@/lib/fashion-brands";
import { isIntimateName } from "@/lib/lingerie";
import { LOOK_CATEGORIES, categorizeLook, type LookCategory } from "@/lib/look-category";
import { findBrandsInText } from "@/lib/fashion-brands";
import { auditProducts, auditEscapes } from "@/lib/reel-audit";
import PlaceSearchInput from "@/components/PlaceSearchInput";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

// Garment types a curator can target the search with (select one, sorted A→Z list
// in the dropdown). Keeps the search focused on a real category.
const GARMENT_TYPES = ["Dress", "Gown", "Maxi dress", "Mini dress", "Skirt", "Trousers", "Jeans", "Jacket", "Blazer", "Coat", "Top", "Blouse", "Bodysuit", "Jumpsuit", "Co-ord set", "Knitwear", "Swimsuit", "Lingerie"];
const BRAND_OPTIONS = [...new Set(FASHION_BRANDS)].sort((a, b) => a.localeCompare(b));

// Default "house" taste for the LuxuryBandit admin (PIN/email, not acting as a
// specific curator). Keeps the studio form fully usable — favourite brands,
// styles, colours — without a curator session. Curators see their own saved taste.
const DEFAULT_HOUSE_FILTERS: { label: string; tags: string[] }[] = [
  { label: "Brands", tags: ["Dolce & Gabbana", "Versace", "Bottega Veneta", "Saint Laurent", "Gucci", "Prada", "Mugler", "Jimmy Choo", "Manolo Blahnik", "Loro Piana", "Max Mara", "Tom Ford", "Valentino", "Chloé"] },
  { label: "Style", tags: ["Elegant", "Minimal", "Statement", "Romantic", "Edgy", "Classic"] },
  { label: "Colors", tags: ["Black", "White", "Red", "Beige", "Gold", "Navy"] },
  { label: "Price", tags: ["Luxury", "Premium", "Mid-range"] },
];

const ADMIN_PIN_KEY = "luxurybandit-try-look-admin-pin";
const STORE_NAME = "LuxuryBandit";
const STORE_SLUG = "luxurybandit";

// Affiliate partner stores curators source looks from (these already run
// affiliate programs). Used for the quick-pick row + the import placeholder.
const PARTNER_STORES = [
  { name: "Revolve", url: "https://www.revolve.com/" },
  { name: "Ally Fashion", url: "https://allyfashion.com/" },
];

function getStoredPin() {
  if (typeof window === "undefined") return "";
  try { return localStorage.getItem(ADMIN_PIN_KEY) ?? ""; } catch { return ""; }
}

function getCuratorId() {
  if (typeof window === "undefined") return "";
  try { return (JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id as string) ?? ""; } catch { return ""; }
}

function getCuratorName() {
  if (typeof window === "undefined") return "";
  try { return (JSON.parse(localStorage.getItem("lb_curator") ?? "{}").firstName as string) ?? ""; } catch { return ""; }
}

function getCuratorStyle() {
  if (typeof window === "undefined") return "";
  try { return (JSON.parse(localStorage.getItem("lb_curator") ?? "{}").style as string) ?? ""; } catch { return ""; }
}

type DiscoverItem = { title: string; link: string; thumbnail: string; price: string; priceValue: number; source: string; fromPartner: boolean };

// Re-running the exact same filter set reuses results instead of spending
// another SerpApi search. Lives at module scope so it survives re-renders.
const discoverClientCache = new Map<string, DiscoverItem[]>();

// Pull a Google-hosted thumbnail through our proxy and turn it into a data URL
// (so it can become the look's main image, same-origin, no CORS taint).
async function thumbToDataUrl(thumbnail: string): Promise<string> {
  const res = await fetch(`/api/img-proxy?url=${encodeURIComponent(thumbnail)}`);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Read a File/Blob (or fetch a same-origin URL) into a data URL.
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Studio APIs accept the admin PIN or a curator session — send whichever we have.
function studioHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-try-look-admin-pin": getStoredPin(),
    "x-curator-id": getCuratorId(),
  };
}

// Grab the first frame of a video file as a JPEG data URL — used as the look's
// poster/cover when a curator uploads an own reel (so the post has a still too).
function videoFirstFrame(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata"; v.muted = true; (v as any).playsInline = true; v.src = url;
    const fail = () => { URL.revokeObjectURL(url); reject(new Error("Konnte kein Vorschaubild aus dem Video lesen.")); };
    v.onloadeddata = () => { try { v.currentTime = Math.min(0.1, (v.duration || 1) / 2); } catch { fail(); } };
    v.onseeked = () => {
      try {
        const c = document.createElement("canvas");
        c.width = v.videoWidth || 720; c.height = v.videoHeight || 1280;
        c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", 0.85));
      } catch { fail(); }
    };
    v.onerror = fail;
  });
}

// Read an image File as a data URL (for the reverse-image dupe search).
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Bild konnte nicht gelesen werden."));
    r.readAsDataURL(file);
  });
}

type Draft = {
  id: string;
  name: string;
  price: string;
  sourceUrl: string;
  imageUrl: string;
  imageDataUrl: string;
};

async function callImport(url: string): Promise<Draft> {
  const res = await fetch("/api/admin-trend-import", {
    method: "POST",
    headers: studioHeaders(),
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `Import failed (${res.status})`);
  const d = data.draft;
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: d.name, price: d.price, sourceUrl: d.sourceUrl, imageUrl: d.imageUrl ?? "", imageDataUrl: d.imageDataUrl };
}

// Best-effort visual dupe search; returns [] if no key / fails (publish still works).
// imageUrl = hosted product photo (Find products). imageData = base64 data URL for
// AI-generated looks, which the API uploads + signs so Google Lens can read it.
async function callDupes(imageUrl: string, imageData?: string): Promise<any[]> {
  if (!imageUrl && !imageData) return [];
  try {
    const res = await fetch("/api/admin-dupes", {
      method: "POST",
      headers: studioHeaders(),
      body: JSON.stringify({ imageUrl, imageData }),
    });
    const data = await res.json();
    if (!res.ok || data.error) return [];
    return Array.isArray(data.alternatives) ? data.alternatives : [];
  } catch {
    return [];
  }
}

// Keyword "similar escapes" search (Google Images) for the Reel location — works
// even on AI-generated location renders, where reverse-image search finds nothing.
async function callPlaceSearch(query: string): Promise<any[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch("/api/place-search", { method: "POST", headers: studioHeaders(), body: JSON.stringify({ query }) });
    const data = await res.json();
    if (!res.ok || data.error) return [];
    return Array.isArray(data.results) ? data.results : [];
  } catch { return []; }
}

// Multi-place escapes search. One field controls everything:
//   "Greece, Thailand"     → search BOTH at once, REPLACE the list (only these)
//   "+Thailand, +Greece"   → mark places with "+" to ADD them to the existing list
// Any "+" (on the whole string or a single place) switches to add-mode. Each place
// is one SerpApi call, so we cap at 5 places to stay frugal.
async function callPlaceSearchMulti(raw: string): Promise<{ additive: boolean; results: any[] }> {
  const tokens = raw.split(",").map(s => s.trim()).filter(Boolean);
  const additive = tokens.some(t => t.startsWith("+"));
  const places = [...new Set(tokens.map(t => t.replace(/^\+\s*/, "").trim()).filter(Boolean))].slice(0, 5);
  if (!places.length) return { additive, results: [] };
  const lists = await Promise.all(places.map(p => callPlaceSearch(p)));
  const seen = new Set<string>();
  const results = lists.flat().filter((f: any) => f?.link && f?.thumbnail && !seen.has(f.link) && (seen.add(f.link), true));
  return { additive, results };
}

// Brand-aware shop search (Google Shopping text query) — surfaces actual on-brand
// products (e.g. real Tom Ford pieces) that a pure visual match would miss.
// Returns alternatives in the look's shape, or [] on failure.
async function callDiscoverAlternatives(queries: string[]): Promise<any[]> {
  if (!queries.length) return [];
  try {
    const res = await fetch("/api/discover", {
      method: "POST",
      headers: studioHeaders(),
      body: JSON.stringify({ queries }),
    });
    const data = await res.json();
    if (!res.ok || data.error) return [];
    return (Array.isArray(data.items) ? data.items : []).map((i: any) => ({
      title: i.title, link: i.link, thumbnail: i.thumbnail,
      price: i.price, priceValue: i.priceValue, source: i.source,
    }));
  } catch {
    return [];
  }
}

// Best-effort English editorial description (1–2 sentences). Returns "" on failure.
async function callDescribe(name: string): Promise<string> {
  try {
    const res = await fetch("/api/admin-ai", {
      method: "POST",
      headers: studioHeaders(),
      body: JSON.stringify({
        prompt: `Write a short, aspirational editorial description in ENGLISH (1–2 sentences, max 240 characters) for this fashion look: "${name}". Describe the style, mood and who it's for. No price, no hashtags, no quotes — just the sentence(s).`,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) return "";
    return String(data.text ?? "").trim().slice(0, 280);
  } catch {
    return "";
  }
}

// Best-effort short, catchy look TITLE for AI-generated looks (no user name).
// styleHint is the taste-filter string the look was generated with. Returns "" on failure.
async function callName(styleHint: string): Promise<string> {
  try {
    const res = await fetch("/api/admin-ai", {
      method: "POST",
      headers: studioHeaders(),
      body: JSON.stringify({
        prompt: `Invent a short, catchy fashion look title in ENGLISH (3–6 words, max 50 characters) for an outfit styled like this: "${styleHint || "elegant on-trend look"}". Example format: "Emerald Silk Slip Dress". No quotes, no price, no hashtags — just the title.`,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) return "";
    return String(data.text ?? "").trim().replace(/^["']|["']$/g, "").slice(0, 60);
  } catch {
    return "";
  }
}

// Keep only wearable garments in a look's shop ladder — drop accessories (jewellery,
// eyewear, bags, shoes, fragrance, etc.) that fuzzy brand/visual search drags in.
const ACCESSORY_RE = /\b(bracelet|necklace|earrings?|ring|pendant|brooch|cufflinks?|jewell?ery|watch|eyeglass(es)?|sunglass(es)?|glasses|eyewear|frames?|belt|bag|clutch|tote|handbag|wallet|purse|backpack|perfume|fragrance|cologne|eau de|lipstick|mascara|makeup|beauty|skincare|scarf|hat|cap|gloves?|socks?|tights|shoes?|sandals?|heels?|pumps?|boots?|sneakers?|loafers?|mules?|slippers?|keychain|keyring|phone case|hair clip)\b/i;
function isApparel(title: string): boolean {
  return !ACCESSORY_RE.test(title ?? "");
}

function storeNameFromUrl(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "").split(".")[0];
    return h ? h.charAt(0).toUpperCase() + h.slice(1) : "Shop";
  } catch { return "Shop"; }
}

async function callPublish(draft: Draft, name: string, price: string, brandQueries?: string[], guaranteedAlt?: any, modelImage?: string, description?: string, lingerie?: boolean, category?: LookCategory): Promise<{ altCount: number }> {
  // An AI-generated look has no source shop URL. Its shop "Vorschläge" come from TWO
  // sources merged: (1) brand-aware text search so real on-brand pieces (e.g. Tom
  // Ford) show up, then (2) a reverse-image search for visually similar dupes across
  // budgets. A Find-products look instead keeps its real source product guaranteed.
  const isAiLook = !draft.sourceUrl;
  const lensDupes = isAiLook
    ? await callDupes("", draft.imageDataUrl)   // AI image → upload + Lens
    : await callDupes(draft.imageUrl);          // hosted product photo → Lens
  let alternatives: any[];
  if (isAiLook) {
    const brandItemsRaw = brandQueries?.length ? await callDiscoverAlternatives(brandQueries) : [];
    // Apparel only — no jewellery, eyewear, bags, shoes, fragrance.
    const brandItems = brandItemsRaw.filter(a => isApparel(a?.title));
    const dupes = lensDupes.filter(a => isApparel(a?.title));
    // Build a ladder that spans budgets: the exact garment first (guaranteed), then a
    // FEW on-brand pieces, then fill the rest with cheaper visual dupes so "shop it
    // cheaper" actually has cheaper options. Dedupe by link, cap at 12.
    const guaranteed = guaranteedAlt?.link && guaranteedAlt?.thumbnail && isApparel(guaranteedAlt?.title) ? [guaranteedAlt] : [];
    const seen = new Set<string>();
    alternatives = [...guaranteed, ...brandItems.slice(0, 4), ...dupes, ...brandItems.slice(4)]
      .filter(a => a?.link && a?.thumbnail && !seen.has(a.link) && (seen.add(a.link), true))
      .slice(0, 12);
  } else {
    alternatives = [
        ...lensDupes.slice(0, 11),
        {
          title: name,
          link: draft.sourceUrl,
          // Use the image we already downloaded at import time (the remote URL may
          // be hotlink-protected), so it always renders.
          thumbnail: draft.imageDataUrl || draft.imageUrl,
          price,
          source: storeNameFromUrl(draft.sourceUrl),
        },
      ];
  }
  // Use the curator's own description when they wrote one; otherwise auto-write.
  const productNote = (description && description.trim()) ? description.trim() : await callDescribe(name);
  const main = draft.imageDataUrl;
  const res = await fetch("/api/try-this-look", {
    method: "POST",
    headers: studioHeaders(),
    body: JSON.stringify({
      action: "upload-look",
      name,
      price,
      productNote,
      storeName: STORE_NAME,
      storeSlug: STORE_SLUG,
      alternatives,
      productType: "real",
      aiCreated: isAiLook,    // AI Fashion creation vs curated web find — drives the badge
      category: category ?? undefined, // editorial category (After Dark / Riviera / Boudoir / Off-Duty)
      lingerie: (category === "boudoir" || lingerie === true) ? true : undefined, // Boudoir ⇒ private + paid tier
      published: true,
      image: main,            // real product photo = main display (no AI hero)
      frontImage: main,
      garmentFrontImage: draft.imageDataUrl, // real product = tryon garment
      // Chosen model: the server dresses this photo in the garment and publishes
      // the result as the look image (the bare product stays as the garment).
      ...(modelImage ? { modelImage } : {}),
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `Publish failed (${res.status})`);
  return { altCount: alternatives.length, lookId: data.lookId as string | undefined, modelReady: !!data.modelReady };
}

// ─── UI bits (LuxuryBandit admin CI) ───────────────────────────────────────────

function Btn({ onClick, disabled, icon: Icon, variant = "primary", children }: { onClick: () => void; disabled?: boolean; icon?: typeof Wand2; variant?: "primary" | "ghost" | "dark"; children: ReactNode }) {
  const cls = variant === "dark"
    ? "bg-black text-white hover:bg-black/90"
    : variant === "primary"
    ? "bg-cobalt text-white hover:bg-cobalt/90"
    : "border border-black/10 bg-white text-ink/60 hover:text-ink";
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-black transition disabled:opacity-40 ${cls}`}>
      {Icon && <Icon aria-hidden="true" className="h-4 w-4" />}
      {children}
    </button>
  );
}

// Lightweight crop tool — no external dependency. Shows the full image and lets
// the curator drag a crop box (move + resize), with optional aspect presets.
function CropModal({ file, onCancel, onApply }: { file: File; onCancel: () => void; onApply: (f: File) => void }) {
  const [src, setSrc] = useState("");
  const [disp, setDisp] = useState({ w: 0, h: 0 });        // displayed image size (px)
  const [box, setBox] = useState({ x: 0, y: 0, w: 0, h: 0 }); // crop box in displayed px
  const [aspect, setAspect] = useState<number | null>(null);  // w/h, null = free
  const imgRef = useRef<HTMLImageElement | null>(null);
  const natural = useRef({ w: 0, h: 0 });
  const drag = useRef<{ mode: "move" | "resize"; px: number; py: number; box: typeof box } | null>(null);

  useEffect(() => { const u = URL.createObjectURL(file); setSrc(u); return () => URL.revokeObjectURL(u); }, [file]);

  const onImgLoad = () => {
    const el = imgRef.current; if (!el) return;
    natural.current = { w: el.naturalWidth, h: el.naturalHeight };
    const w = el.clientWidth, h = el.clientHeight;
    setDisp({ w, h });
    // start with a centered box covering 80%
    const bw = w * 0.8, bh = h * 0.8;
    setBox({ x: (w - bw) / 2, y: (h - bh) / 2, w: bw, h: bh });
  };

  const applyAspect = (a: number | null) => {
    setAspect(a);
    if (!a || !disp.w) return;
    // fit the largest centered box of this aspect inside the image
    let bw = disp.w, bh = bw / a;
    if (bh > disp.h) { bh = disp.h; bw = bh * a; }
    setBox({ x: (disp.w - bw) / 2, y: (disp.h - bh) / 2, w: bw, h: bh });
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current; if (!d) return;
      const dx = e.clientX - d.px, dy = e.clientY - d.py;
      if (d.mode === "move") {
        setBox({
          ...d.box,
          x: Math.min(Math.max(0, d.box.x + dx), disp.w - d.box.w),
          y: Math.min(Math.max(0, d.box.y + dy), disp.h - d.box.h),
        });
      } else {
        let nw = Math.max(40, Math.min(d.box.w + dx, disp.w - d.box.x));
        let nh = aspect ? nw / aspect : Math.max(40, Math.min(d.box.h + dy, disp.h - d.box.y));
        if (aspect && nh > disp.h - d.box.y) { nh = disp.h - d.box.y; nw = nh * aspect; }
        setBox({ ...d.box, w: nw, h: nh });
      }
    };
    const up = () => { drag.current = null; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [disp, aspect]);

  const apply = () => {
    const scaleX = natural.current.w / disp.w, scaleY = natural.current.h / disp.h;
    const sx = box.x * scaleX, sy = box.y * scaleY, sw = box.w * scaleX, sh = box.h * scaleY;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw); canvas.height = Math.round(sh);
    const ctx = canvas.getContext("2d"); if (!ctx || !imgRef.current) return;
    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      onApply(new File([blob], file.name.replace(/\.\w+$/, "") + "-crop.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  };

  const presets: { label: string; a: number | null }[] = [
    { label: "Free", a: null }, { label: "3:4", a: 3 / 4 }, { label: "1:1", a: 1 }, { label: "9:16", a: 9 / 16 },
  ];

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-black text-ink">Crop photo</p>
          <button type="button" onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-full bg-black/5 text-ink/50"><X className="h-4 w-4" /></button>
        </div>

        <div className="mb-3 flex gap-1.5">
          {presets.map(p => (
            <button key={p.label} type="button" onClick={() => applyAspect(p.a)}
              className={`rounded-full px-3 py-1 text-[11px] font-black transition ${aspect === p.a ? "bg-black text-white" : "border border-black/12 bg-white text-ink/50"}`}>{p.label}</button>
          ))}
        </div>

        <div className="relative mx-auto select-none overflow-hidden rounded-lg bg-[repeating-conic-gradient(#0000000a_0%_25%,#0000_0%_50%)] bg-[length:16px_16px]" style={{ touchAction: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {src && <img ref={imgRef} src={src} alt="" onLoad={onImgLoad} draggable={false} className="block max-h-[60vh] w-full object-contain" />}
          {disp.w > 0 && (
            <>
              {/* dark mask via box-shadow on the crop rect */}
              <div className="absolute border-2 border-white"
                style={{ left: box.x, top: box.y, width: box.w, height: box.h, boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)", cursor: "move" }}
                onPointerDown={e => { e.preventDefault(); drag.current = { mode: "move", px: e.clientX, py: e.clientY, box }; }}>
                {/* resize handle */}
                <div className="absolute -bottom-2 -right-2 h-5 w-5 rounded-full border-2 border-black bg-white"
                  style={{ cursor: "nwse-resize" }}
                  onPointerDown={e => { e.preventDefault(); e.stopPropagation(); drag.current = { mode: "resize", px: e.clientX, py: e.clientY, box }; }} />
              </div>
            </>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onCancel} className="h-11 flex-1 rounded-md border border-black/15 text-sm font-black text-ink/60">Cancel</button>
          <button type="button" onClick={apply} className="h-11 flex-[2] rounded-md bg-black text-sm font-black text-white">Apply crop</button>
        </div>
      </div>
    </div>
  );
}

function DraftCard({ draft, onRemove }: { draft: Draft; onRemove: () => void }) {
  const [name, setName] = useState(draft.name);
  const [price, setPrice] = useState(draft.price);
  // Pre-select a category by inferring from the draft name; creator can override.
  const [category, setCategory] = useState<LookCategory>(() => categorizeLook({ name: draft.name }));
  const [status, setStatus] = useState<"idle" | "publishing" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [altCount, setAltCount] = useState(0);

  const publish = async () => {
    setStatus("publishing");
    setError("");
    try {
      const { altCount } = await callPublish(draft, name.trim() || "Trend Look", price.trim(), undefined, undefined, undefined, undefined, category === "boudoir", category);
      setAltCount(altCount);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  };

  return (
    <article className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-soft">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-panel">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={draft.imageDataUrl} alt={name} className="h-full w-full object-cover" />
      </div>
      <div className="grid gap-3 p-4">
        <div className="grid gap-1.5">
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-ink/40">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={status === "done"}
            className="h-10 w-full rounded-md border border-black/10 bg-panel px-3 text-sm font-semibold text-ink outline-none focus:border-cobalt disabled:opacity-60" />
          {/* Curators must not put brand names in their public copy (licensing). Users
              may; we may not. Warn so the curator removes it before publishing. */}
          {(() => {
            const brands = findBrandsInText(name);
            return brands.length > 0 ? (
              <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold leading-snug text-amber-700">
                ⚠️ Markenname erkannt: <span className="font-black">{brands.join(", ")}</span>. Als Curator bitte entfernen (Lizenz) — die User sehen den Namen.
              </p>
            ) : null;
          })()}
        </div>
        <div className="grid gap-1.5">
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-ink/40">Preis</span>
          <input value={price} onChange={(e) => setPrice(e.target.value)} disabled={status === "done"} placeholder="z. B. 129.21 RON"
            className="h-10 w-full rounded-md border border-black/10 bg-panel px-3 text-sm font-semibold text-ink outline-none focus:border-cobalt disabled:opacity-60" />
        </div>
        <a href={draft.sourceUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-black text-cobalt hover:underline">
          <ExternalLink className="h-3.5 w-3.5" /> Quelle / Affiliate-Link
        </a>
        {/* Creator picks the editorial category. Boudoir (lingerie) forces try-ons
            private (never public) + paid tier, and is hidden from the "All" feed. */}
        <div className="grid gap-1.5">
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-ink/40">Kategorie</span>
          <div className="grid grid-cols-2 gap-1.5">
            {LOOK_CATEGORIES.map((c) => (
              <button key={c.slug} type="button" disabled={status === "done"}
                onClick={() => setCategory(c.slug)}
                className={`rounded-md border px-3 py-2 text-left text-sm font-bold transition disabled:opacity-60 ${category === c.slug ? "border-black bg-black text-white" : "border-black/10 bg-panel text-ink hover:border-black/30"}`}>
                {c.slug === "boudoir" ? "🔒 " : ""}{c.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] font-medium text-ink/45">
            {category === "boudoir"
              ? "Boudoir: try-ons bleiben privat (nie öffentlich) + bezahlt, versteckt unter „All“."
              : LOOK_CATEGORIES.find((c) => c.slug === category)?.blurb}
          </span>
        </div>

        {status === "done" ? (
          <div className="grid gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-black text-green-700"><Check className="h-4 w-4" /> In Trends veröffentlicht</span>
              <a href="/stores" target="_blank" rel="noopener noreferrer" className="text-xs font-black text-green-700 underline">Ansehen</a>
            </div>
            <span className="text-xs font-bold text-green-700/70">
              {altCount > 0 ? `${altCount} Shop-Optionen gefunden` : "Keine Optionen gefunden (SERPAPI_KEY gesetzt?)"}
            </span>
          </div>
        ) : (
          <>
            {error && <p className="text-xs font-bold text-coral">{error}</p>}
            <div className="flex items-center gap-2">
              <Btn onClick={publish} disabled={status === "publishing"} icon={status === "publishing" ? undefined : Check}>
                {status === "publishing" ? <><Loader2 className="h-4 w-4 animate-spin" /> Veröffentliche…</> : "Ja – veröffentlichen"}
              </Btn>
              <Btn onClick={onRemove} disabled={status === "publishing"} variant="ghost" icon={Trash2}>Nein</Btn>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

function PinGate({ onSaved }: { onSaved: (pin: string) => void }) {
  const [value, setValue] = useState("");
  const save = () => {
    const pin = value.trim();
    if (!pin) return;
    try { localStorage.setItem(ADMIN_PIN_KEY, pin); } catch { /**/ }
    onSaved(pin);
  };
  return (
    <main className="grid min-h-screen place-items-center bg-[#fbfaf7] px-4 text-ink">
      <div className="w-full max-w-sm rounded-lg border border-black/10 bg-white p-6 shadow-soft">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-cobalt">LuxuryBandit Admin</div>
        <h1 className="mt-1 text-2xl font-black text-ink">Trends</h1>
        <p className="mt-1 mb-5 text-sm font-semibold text-ink/55">Gib deinen Admin-PIN ein, um fortzufahren.</p>
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Admin-PIN" onKeyDown={(e) => { if (e.key === "Enter") save(); }}
          className="mb-4 h-11 w-full rounded-md border border-black/10 bg-panel px-3.5 text-sm font-semibold text-ink outline-none focus:border-cobalt" />
        <Btn onClick={save} disabled={!value.trim()} icon={ArrowLeft}>Deblochează</Btn>
      </div>
    </main>
  );
}

export default function AdminTrends() {
  const [pin, setPin] = useState<string>(getStoredPin());
  // Before gating, try to adopt a curator session from a signed-in Supabase email,
  // so a curator who's already signed in isn't asked to "sign in as curator" again.
  const [authResolving, setAuthResolving] = useState(true);
  const [, forceAuthRefresh] = useState(0);
  useEffect(() => {
    if (getCuratorId() || getStoredPin()) { setAuthResolving(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const email = getStoredAuthSession()?.user?.email;
        if (email) {
          const res = await fetch("/api/curator", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "signin", email }) });
          const d = res.ok ? await res.json() : null;
          if (!cancelled && d?.curator?.id) {
            try { localStorage.setItem("lb_curator", JSON.stringify(d.curator)); } catch { /**/ }
            try { window.dispatchEvent(new Event("luxurybandit-auth-updated")); } catch { /**/ }
            forceAuthRefresh(n => n + 1);
          }
        }
      } catch { /**/ }
      if (!cancelled) setAuthResolving(false);
    })();
    return () => { cancelled = true; };
  }, []);
  const [urls, setUrls] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  // Partner stores are admin-managed; load them (fall back to the built-ins).
  const [partnerStores, setPartnerStores] = useState<{ name: string; homeUrl: string }[]>(
    PARTNER_STORES.map(s => ({ name: s.name, homeUrl: s.url }))
  );
  useEffect(() => {
    fetch("/api/try-this-look?partnerStores=1", { headers: studioHeaders() })
      .then(r => r.json())
      .then((d: { partnerStores?: { name: string; homeUrl: string }[] }) => {
        if (Array.isArray(d.partnerStores) && d.partnerStores.length) setPartnerStores(d.partnerStores);
      })
      .catch(() => {});
  }, []);
  // Style discovery
  const [style, setStyle] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoverItems, setDiscoverItems] = useState<DiscoverItem[]>([]);
  const [adding, setAdding] = useState<string>("");
  const [usedLinks, setUsedLinks] = useState<string[]>([]);
  const [discoverError, setDiscoverError] = useState("");
  const [searchInfo, setSearchInfo] = useState<{ searched: number; reused: number } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [publishProgress, setPublishProgress] = useState({ done: 0, total: 0 });
  const [publishResult, setPublishResult] = useState("");
  const [myFilters, setMyFilters] = useState<{ label: string; tags: string[] }[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [pickedBrand, setPickedBrand] = useState("");   // brand chosen from the searchable list (or added)
  const [brandQuery, setBrandQuery] = useState("");     // brand search box text
  const [brandOpen, setBrandOpen] = useState(false);    // brand dropdown open
  const [pickedGarment, setPickedGarment] = useState(""); // target garment type
  const [credits, setCredits] = useState<{ credits: number; spent: number; earned: number } | null>(null);
  const [costs, setCosts] = useState<{ tryon: number; search: number; starter: number; video?: number } | null>(null);
  const [justEarned, setJustEarned] = useState<{ label: string; credits: number }[]>([]);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  // Which creation mode the curator picked. They choose one first, then we show
  // only that flow — never both at once.
  const [mode, setMode] = useState<"web" | "ai" | "link" | "reel" | null>(null);
  // Upload-reel tool state (post an own finished video as a feed funnel post)
  const [reelFile, setReelFile] = useState<File | null>(null);
  const [reelClothesFile, setReelClothesFile] = useState<File | null>(null);   // garment → look dupes
  const [reelLocationFile, setReelLocationFile] = useState<File | null>(null);  // place → similar escapes
  const [reelLocationQuery, setReelLocationQuery] = useState("");               // place keyword (reliable)
  const [reelDesc, setReelDesc] = useState("");
  const [reelCategory, setReelCategory] = useState<LookCategory>("after-dark");
  const [reelBusy, setReelBusy] = useState(false);
  const [reelStep, setReelStep] = useState("");
  const [reelMsg, setReelMsg] = useState("");
  const [reelErr, setReelErr] = useState("");
  // Reel-creation curation: search the SerpApi candidates, tick which to keep.
  const [reelSearching, setReelSearching] = useState(false);
  const [reelClothesCands, setReelClothesCands] = useState<{ title?: string; link: string; source?: string; thumbnail: string; price?: string; priceValue?: number; currency?: string }[]>([]);
  const [reelClothesSel, setReelClothesSel] = useState<Set<string>>(new Set());
  const [reelLocCands, setReelLocCands] = useState<{ title?: string; link: string; source?: string; thumbnail: string; price?: string }[]>([]);
  const [reelLocSel, setReelLocSel] = useState<Set<string>>(new Set());
  const [reelAuditMsg, setReelAuditMsg] = useState("");
  // AI Fashion generation state
  const [aiGarmentFile, setAiGarmentFile] = useState<File | null>(null);
  const [aiPersonFile, setAiPersonFile] = useState<File | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  // Lingerie/swim creation → route to FASHN (OpenAI would refuse/cover it up).
  // Auto-detected from the picked garment/brand/taste; the curator can override.
  const [aiLingerieManual, setAiLingerieManual] = useState<boolean | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState("");
  // The real brand product auto-used as the garment reference for the current
  // generation (so the look actually matches the brand, and we can guarantee it
  // as a shop option). null when the curator uploaded their own garment.
  const [aiUsedProduct, setAiUsedProduct] = useState<any | null>(null);
  const [aiFindingGarment, setAiFindingGarment] = useState(false);
  const [curatorPhotoUrl, setCuratorPhotoUrl] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<"person" | "garment" | null>(null);
  const [aiGenerations, setAiGenerations] = useState<{ id: string; image: string; prompt: string; name: string; description?: string; selected: boolean; garmentProduct?: any }[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("lb_ai_generations") ?? "[]"); } catch { return []; }
  });
  // Persist the AI Fashion library so it survives reloads / navigation.
  useEffect(() => {
    try { localStorage.setItem("lb_ai_generations", JSON.stringify(aiGenerations)); }
    catch { /* quota exceeded — keep in-memory only */ }
  }, [aiGenerations]);
  type SerpItem = { title?: string; link: string; source?: string; thumbnail: string; price?: string; priceValue?: number; currency?: string; region?: string };
  const [myLooks, setMyLooks] = useState<{ id: string; name: string; imageUrl: string; published: boolean; altCount: number; locationCount?: number; alternatives?: SerpItem[]; locationDupes?: SerpItem[]; clicks?: Record<string, number>; viewCount?: number; likeCount?: number; tryOnCount?: number; commentCount?: number; clothesImageUrl?: string; locationImageUrl?: string; note?: string; commentsOff?: boolean; videoUrl?: string; brand?: string; category?: string; description?: string }[]>([]);
  const [editingLookId, setEditingLookId] = useState<string | null>(null); // open the edit sheet for one look
  // Edit-sheet curation state (one look at a time): re-upload source images, run the
  // SerpApi search, and tick which results show in the reel's "Bandit the look".
  const [editClothesFile, setEditClothesFile] = useState<File | null>(null);
  const [editLocationFile, setEditLocationFile] = useState<File | null>(null);
  const [editLocationQuery, setEditLocationQuery] = useState("");
  const [clothesCands, setClothesCands] = useState<SerpItem[]>([]);
  const [clothesSel, setClothesSel] = useState<Set<string>>(new Set());
  const [clothesSearching, setClothesSearching] = useState(false);
  const [locCands, setLocCands] = useState<SerpItem[]>([]);
  const [locSel, setLocSel] = useState<Set<string>>(new Set());
  const [locSearching, setLocSearching] = useState(false);
  const [editSaving, setEditSaving] = useState("");
  const [editErr, setEditErr] = useState("");
  const openEdit = (l: { id: string; alternatives?: SerpItem[]; locationDupes?: SerpItem[] }) => {
    setEditingLookId(l.id); setEditErr("");
    setEditClothesFile(null); setEditLocationFile(null); setEditLocationQuery("");
    setClothesCands(l.alternatives ?? []); setClothesSel(new Set((l.alternatives ?? []).map(a => a.link)));
    setLocCands(l.locationDupes ?? []); setLocSel(new Set((l.locationDupes ?? []).map(a => a.link)));
  };
  const dedupeByLink = (items: SerpItem[]) => { const seen = new Set<string>(); return items.filter(i => i.link && i.thumbnail && (seen.has(i.link) ? false : seen.add(i.link))); };
  const [uploadingVideo, setUploadingVideo] = useState<string>("");
  const toggleLookComments = async (lookId: string, commentsOff: boolean) => {
    setMyLooks((ls) => ls.map(l => l.id === lookId ? { ...l, commentsOff } : l));
    await fetch("/api/curator", { method: "POST", headers: studioHeaders(), body: JSON.stringify({ action: "toggle-look-comments", lookId, commentsOff }) }).catch(() => {});
  };
  // Move a look up/down in the feed order, then persist the new order.
  const moveLook = async (lookId: string, dir: -1 | 1) => {
    setMyLooks((ls) => {
      const i = ls.findIndex(l => l.id === lookId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ls.length) return ls;
      const next = [...ls];
      [next[i], next[j]] = [next[j], next[i]];
      void fetch("/api/curator", { method: "POST", headers: studioHeaders(), body: JSON.stringify({ action: "set-feed-order", order: next.map(l => l.id) }) }).catch(() => {});
      return next;
    });
  };
  // Generate a 5s presentation video via Pixverse, then poll until it's ready.
  const generateLookVideo = async (lookId: string) => {
    setUploadingVideo(lookId);
    try {
      const start = await fetch("/api/generate-look-video", { method: "POST", headers: studioHeaders(), body: JSON.stringify({ lookId }) });
      const sd = await start.json();
      if (!start.ok || !sd.videoId) { setUploadingVideo(""); alert(sd.error ?? "Could not start video generation."); return; }
      // Poll up to ~5 min.
      for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const pr = await fetch(`/api/generate-look-video?lookId=${encodeURIComponent(lookId)}`, { headers: studioHeaders() });
        const pd = await pr.json();
        if (pd.status === "done" && pd.videoUrl) { setMyLooks((ls) => ls.map(l => l.id === lookId ? { ...l, videoUrl: pd.videoUrl } : l)); break; }
        if (pd.status === "failed") { alert(pd.error ?? "Video generation failed."); break; }
      }
    } catch { /**/ }
    setUploadingVideo("");
  };
  const removeLookVideo = async (lookId: string) => {
    setUploadingVideo(lookId);
    const fd = new FormData(); fd.append("lookId", lookId); fd.append("remove", "1"); fd.append("curatorId", getCuratorId());
    try { await fetch("/api/upload-look-video", { method: "POST", headers: { "x-curator-id": getCuratorId() }, body: fd }); setMyLooks((ls) => ls.map(l => l.id === lookId ? { ...l, videoUrl: "" } : l)); } catch { /**/ }
    setUploadingVideo("");
  };
  // Upload / replace the look's video with an own clip (e.g. a fresh Pixverse reel).
  const replaceLookVideo = async (lookId: string, file: File) => {
    setUploadingVideo(lookId); setEditErr("");
    if (!file.type.startsWith("video/")) { setEditErr("Datei ist kein Video."); setUploadingVideo(""); return; }
    if (file.size > 50 * 1024 * 1024) { setEditErr("Video zu groß (max. 50 MB)."); setUploadingVideo(""); return; }
    const fd = new FormData(); fd.append("lookId", lookId); fd.append("curatorId", getCuratorId()); fd.append("video", file);
    try {
      const res = await fetch("/api/upload-look-video", { method: "POST", headers: { "x-try-look-admin-pin": getStoredPin(), "x-curator-id": getCuratorId() }, body: fd });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.videoUrl) setMyLooks((ls) => ls.map(l => l.id === lookId ? { ...l, videoUrl: d.videoUrl } : l));
      else setEditErr(d?.error || "Video-Upload fehlgeschlagen — Anmeldung/Pin prüfen.");
    } catch { setEditErr("Video-Upload fehlgeschlagen."); }
    setUploadingVideo("");
  };
  // The "Reel hochladen" tool: take an own finished video (e.g. a Pixverse reel) and
  // post it as a NEW feed look — a funnel post (Try-on / Bandit). Creates the look
  // (poster = the video's first frame, description = public title, category), then
  // attaches the video. Never uses a brand product photo → licensing-safe.
  // Run the SerpApi searches for the reel BEFORE posting, so the curator can tick
  // which results to keep (clothes image / location image+keyword → candidates).
  const runReelSearch = async () => {
    setReelErr("");
    if (!reelClothesFile && !reelLocationFile && !reelLocationQuery.trim()) { setReelErr("Klamotten-Bild und/oder Location-Bild/Suchbegriff wählen, dann suchen."); return; }
    setReelSearching(true);
    try {
      if (reelClothesFile) {
        const found = await callDupes("", await fileToDataUrl(reelClothesFile));
        const seen = new Set<string>(); const uniq = found.filter((f: any) => f.link && f.thumbnail && !seen.has(f.link) && (seen.add(f.link), true));
        setReelClothesCands(uniq); setReelClothesSel(new Set(uniq.map((f: any) => f.link)));
      }
      if (reelLocationQuery.trim()) {
        // Comma-separated multi-place search; leading "+" adds to the current list.
        const { additive, results } = await callPlaceSearchMulti(reelLocationQuery);
        setReelLocCands(prev => { const base = additive ? prev : []; const seen = new Set(base.map((x: any) => x.link)); return [...base, ...results.filter((f: any) => f.link && f.thumbnail && !seen.has(f.link) && (seen.add(f.link), true))]; });
        setReelLocSel(prev => { const n = additive ? new Set(prev) : new Set<string>(); results.forEach((f: any) => n.add(f.link)); return n; });
      } else if (reelLocationFile) {
        const loc = await callDupes("", await fileToDataUrl(reelLocationFile));
        const seenL = new Set<string>(); const uniqL = loc.filter((f: any) => f.link && f.thumbnail && !seenL.has(f.link) && (seenL.add(f.link), true));
        setReelLocCands(uniqL); setReelLocSel(new Set(uniqL.map((f: any) => f.link)));
      }
    } catch { setReelErr("Suche fehlgeschlagen."); }
    setReelSearching(false);
  };
  // Pre-post check: deselect blind text, dead links, and non-booking/social places.
  const runReelAnalysis = () => {
    const p = auditProducts(reelClothesCands);
    const e = auditEscapes(reelLocCands);
    if (p.drop.size) setReelClothesSel(s => { const n = new Set(s); p.drop.forEach(l => n.delete(l)); return n; });
    if (e.drop.size) setReelLocSel(s => { const n = new Set(s); e.drop.forEach(l => n.delete(l)); return n; });
    const reasons = (m: Record<string, string>) => { const c: Record<string, number> = {}; Object.values(m).forEach(r => c[r] = (c[r] ?? 0) + 1); return Object.entries(c).map(([r, n]) => `${n}× ${r}`).join(", "); };
    const parts: string[] = [];
    if (p.drop.size) parts.push(`Produkte: ${p.drop.size} abgewählt (${reasons(p.reasons)})`);
    if (e.drop.size) parts.push(`Orte: ${e.drop.size} abgewählt (${reasons(e.reasons)})`);
    setReelAuditMsg(parts.length ? `Korrektur — ${parts.join(" · ")}. Häkchen prüfen, dann posten.` : "Alles sauber ✅ — keine Blindtext-/toten-Link-/Nicht-Buchungs-Treffer.");
  };
  // One selectable candidate row: thumbnail + title + source + price (+ clicks),
  // an "open" link and a tick — so the curator picks by details, not just the image.
  const candRow = (c: SerpItem, selected: boolean, onToggle: () => void, clickCount?: number) => (
    <div key={c.link} className={`flex items-center gap-2.5 rounded-lg border p-1.5 transition ${selected ? "border-cobalt bg-cobalt/[0.05]" : "border-black/10"}`}>
      <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.thumbnail} alt="" className="h-full w-full object-cover" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[12px] font-black leading-snug text-ink">{c.title || c.source || "—"}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-bold">
            {c.price && <span className="rounded bg-emerald-50 px-1 text-emerald-700">{c.price}</span>}
            {c.region && <span className="rounded bg-cobalt/10 px-1 text-cobalt">📍 {c.region}</span>}
            {c.source && <span className="text-ink/45">{c.source}</span>}
            {!!clickCount && <span className="text-ink/45">👁 {clickCount}</span>}
          </span>
        </span>
      </button>
      <a href={c.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Öffnen"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink/40 hover:bg-black/5"><ExternalLink className="h-3.5 w-3.5" /></a>
      <button type="button" onClick={onToggle} aria-label="Auswählen"
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-[11px] font-black transition ${selected ? "border-cobalt bg-cobalt text-white" : "border-black/20 text-transparent"}`}>✓</button>
    </div>
  );
  const toggleIn = (setter: (fn: (s: Set<string>) => Set<string>) => void, link: string) =>
    setter(s => { const n = new Set(s); n.has(link) ? n.delete(link) : n.add(link); return n; });
  const publishReel = async () => {
    setReelErr(""); setReelMsg("");
    if (!reelFile) { setReelErr("Bitte ein Video (MP4) wählen."); return; }
    if (!reelFile.type.startsWith("video/")) { setReelErr("Bitte eine Videodatei (MP4) wählen."); return; }
    if (reelFile.size > 50 * 1024 * 1024) { setReelErr("Video zu groß (max 50 MB)."); return; }
    if (!reelDesc.trim()) { setReelErr("Bitte eine kurze Beschreibung (öffentlicher Titel) eingeben."); return; }
    const brands = findBrandsInText(reelDesc);
    if (brands.length > 0 && !confirm(`Achtung: Markenname in der Beschreibung (${brands.join(", ")}). Als Curator solltest du den entfernen (Lizenz). Trotzdem posten?`)) return;
    setReelBusy(true);
    try {
      setReelStep("Vorschaubild aus dem Video…");
      const poster = await videoFirstFrame(reelFile);
      // 1) create the look (funnel post) with the poster as the safe still
      setReelStep("Feed-Post anlegen…");
      const r1 = await fetch("/api/try-this-look", { method: "POST", headers: studioHeaders(), body: JSON.stringify({
        action: "upload-look",
        name: reelDesc.trim().slice(0, 80) || "Reel",
        productNote: reelDesc.trim(),
        category: reelCategory,
        lingerie: reelCategory === "boudoir" ? true : undefined,
        productType: "real",
        aiCreated: false,
        published: true,
        image: poster,
        frontImage: poster,
        curatorId: getCuratorId(),
      }) });
      const d1 = await r1.json();
      const lookId = d1.lookId || d1.look?.id;
      if (!r1.ok || !lookId) { setReelErr(d1.error ?? "Look konnte nicht angelegt werden."); setReelBusy(false); setReelStep(""); return; }
      // 2) attach the video
      setReelStep("Video hochladen…");
      const fd = new FormData();
      fd.append("lookId", lookId);
      fd.append("curatorId", getCuratorId());
      fd.append("video", reelFile);
      const r2 = await fetch("/api/upload-look-video", { method: "POST", headers: { "x-try-look-admin-pin": getStoredPin(), "x-curator-id": getCuratorId() }, body: fd });
      const d2 = await r2.json();
      if (!r2.ok || !d2.videoUrl) { setReelErr(d2.error ?? "Video-Upload fehlgeschlagen (Look wurde angelegt)."); setReelBusy(false); setReelStep(""); return; }
      // 3) clothes image → shop dupes (similar looks for less). 4) location image →
      // similar escapes (reverse-image search). Both stored on the look for "Bandit the look".
      let alternatives: any[] = [];
      let locationDupes: any[] = [];
      const triedLocation = !!reelLocationFile || !!reelLocationQuery.trim();
      if (reelClothesCands.length || reelLocCands.length) {
        // The curator already searched + ticked — use exactly their selection.
        alternatives = reelClothesCands.filter(c => reelClothesSel.has(c.link)).slice(0, 16);
        locationDupes = reelLocCands.filter(c => reelLocSel.has(c.link)).slice(0, 12);
      } else {
        // No preview search → auto-search and keep everything (back-compat).
        if (reelClothesFile) {
          setReelStep("Ähnliche Looks suchen…");
          try { alternatives = await callDupes("", await fileToDataUrl(reelClothesFile)); } catch { /**/ }
        }
        if (triedLocation) {
          setReelStep("Ähnliche Orte suchen…");
          if (reelLocationQuery.trim()) { try { locationDupes = (await callPlaceSearchMulti(reelLocationQuery)).results; } catch { /**/ } }
          if (!locationDupes.length && reelLocationFile) { try { locationDupes = await callDupes("", await fileToDataUrl(reelLocationFile)); } catch { /**/ } }
        }
      }
      if (alternatives.length || locationDupes.length || reelClothesFile || reelLocationFile) {
        setReelStep("Treffer & Bilder speichern…");
        await fetch("/api/try-this-look", { method: "POST", headers: studioHeaders(), body: JSON.stringify({
          action: "update-look", id: lookId,
          ...(alternatives.length ? { alternatives } : {}),
          ...(locationDupes.length ? { locationDupes } : {}),
          ...(reelClothesFile ? { clothesImage: await fileToDataUrl(reelClothesFile) } : {}),
          ...(reelLocationFile ? { locationImage: await fileToDataUrl(reelLocationFile) } : {}),
        }) }).catch(() => {});
      }
      const locNote = triedLocation && !locationDupes.length ? " · keine Orte gefunden (Suchbegriff eingeben?)" : locationDupes.length ? ` · ${locationDupes.length} Orte` : "";
      setReelMsg(`Reel ist live im Feed ✨${alternatives.length ? ` · ${alternatives.length} ähnliche Looks` : ""}${locNote}`);
      setReelFile(null); setReelClothesFile(null); setReelLocationFile(null); setReelLocationQuery(""); setReelDesc("");
      setReelClothesCands([]); setReelClothesSel(new Set()); setReelLocCands([]); setReelLocSel(new Set()); setReelAuditMsg("");
      void fetch("/api/curator?mylooks=1", { headers: studioHeaders() }).then(r => r.json()).then((d: any) => setMyLooks(d.looks ?? [])).catch(() => {});
    } catch (e) {
      setReelErr(e instanceof Error ? e.message : "Upload fehlgeschlagen.");
    }
    setReelBusy(false); setReelStep("");
  };
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string>("");
  const saveLookNote = async (lookId: string) => {
    const note = noteDrafts[lookId] ?? "";
    setSavingNote(lookId);
    await fetch("/api/curator", { method: "POST", headers: studioHeaders(), body: JSON.stringify({ action: "update-look-note", lookId, note }) }).catch(() => {});
    setMyLooks((ls) => ls.map(l => l.id === lookId ? { ...l, note } : l));
    setSavingNote("");
  };
  const loadMyLooks = () => fetch("/api/curator?mylooks=1", { headers: studioHeaders() }).then(r => r.json()).then((d: any) => setMyLooks(d.looks ?? [])).catch(() => {});

  // My try-ons — the creator's own try-on generations (photo + optional video).
  // These live in `state.generations` (separate from looks), so surface them here
  // so a creator can find, download and post the videos they make.
  const [myTryons, setMyTryons] = useState<{ id: string; lookId: string; imageUrl: string; videoUrl?: string; feed: boolean; lockedByAdmin?: boolean; lookName: string; createdAt: number }[]>([]);
  const loadMyTryons = () => {
    const id = getCuratorId();
    if (!id) return Promise.resolve();
    return fetch(`/api/try-this-look?curatorTryons=${encodeURIComponent(id)}&manage=1`)
      .then(r => r.json())
      .then((d: { userGallery?: typeof myTryons }) => setMyTryons((d.userGallery ?? []).slice().sort((a, b) => b.createdAt - a.createdAt)))
      .catch(() => {});
  };
  const studioIsAdmin = (): boolean => !!getStoredPin();
  const [tryonFeedBusy, setTryonFeedBusy] = useState<string>("");
  const toggleTryonFeed = async (genId: string, feed: boolean) => {
    setTryonFeedBusy(genId);
    const prev = myTryons;
    // Send admin headers so an admin in the studio can lift an admin-deactivation.
    setMyTryons(ts => ts.map(t => t.id === genId ? { ...t, feed, lockedByAdmin: studioIsAdmin() ? !feed : t.lockedByAdmin } : t));
    try {
      const res = await fetch("/api/try-this-look", { method: "POST", headers: studioHeaders(), body: JSON.stringify({ action: "set-generation-feed", generationId: genId, feed }) });
      if (!res.ok) {
        setMyTryons(prev); // server refused (e.g. admin-deactivated) → revert
        if (res.status === 403) alert("This try-on was deactivated by an admin and can only be reactivated by an admin.");
      }
    } catch { setMyTryons(prev); }
    setTryonFeedBusy("");
  };
  // Edit a published look's brand (overrides name-based detection).
  const [brandDrafts, setBrandDrafts] = useState<Record<string, string>>({});
  const [savingBrand, setSavingBrand] = useState<string>("");
  const saveLookBrand = async (lookId: string) => {
    const brand = (brandDrafts[lookId] ?? "").trim();
    setSavingBrand(lookId);
    await fetch("/api/curator", { method: "POST", headers: studioHeaders(), body: JSON.stringify({ action: "update-look-meta", lookId, brand }) }).catch(() => {});
    setMyLooks((ls) => ls.map(l => l.id === lookId ? { ...l, brand } : l));
    setSavingBrand("");
  };
  // Change a look's editorial category from the studio (Boudoir ⇒ private + paid).
  const setMyLookCategory = async (lookId: string, category: LookCategory) => {
    setMyLooks((ls) => ls.map(l => l.id === lookId ? { ...l, category } : l));
    await fetch("/api/try-this-look", { method: "POST", headers: studioHeaders(), body: JSON.stringify({ action: "update-look", id: lookId, category }) }).catch(() => {});
  };
  // Run the SerpApi search for the look's clothes (or location) and add the hits as
  // tickable candidates (newly found ones are pre-checked).
  const runClothesSearch = async (l: { clothesImageUrl?: string }) => {
    setClothesSearching(true);
    try {
      const found = editClothesFile ? await callDupes("", await fileToDataUrl(editClothesFile)) : l.clothesImageUrl ? await callDupes(l.clothesImageUrl) : [];
      setClothesCands(prev => dedupeByLink([...prev, ...found]));
      setClothesSel(prev => { const n = new Set(prev); found.forEach((f: SerpItem) => n.add(f.link)); return n; });
    } catch { /**/ }
    setClothesSearching(false);
  };
  const runLocationSearch = async (l: { locationImageUrl?: string }) => {
    setLocSearching(true);
    try {
      if (editLocationQuery.trim()) {
        // Comma-separated multi-place search; leading "+" adds, otherwise replaces.
        const { additive, results } = await callPlaceSearchMulti(editLocationQuery);
        setLocCands(prev => dedupeByLink(additive ? [...prev, ...results] : results));
        setLocSel(prev => { const n = additive ? new Set(prev) : new Set<string>(); results.forEach((f: SerpItem) => n.add(f.link)); return n; });
      } else {
        const found = editLocationFile ? await callDupes("", await fileToDataUrl(editLocationFile)) : l.locationImageUrl ? await callDupes(l.locationImageUrl) : [];
        setLocCands(prev => dedupeByLink([...prev, ...found]));
        setLocSel(prev => { const n = new Set(prev); found.forEach((f: SerpItem) => n.add(f.link)); return n; });
      }
    } catch { /**/ }
    setLocSearching(false);
  };
  // Save the edit-sheet curation: the ticked clothes → alternatives, ticked places →
  // locationDupes, plus any replaced source images.
  const saveEditLists = async (lookId: string): Promise<boolean> => {
    setEditSaving(lookId); setEditErr("");
    const alternatives = clothesCands.filter(c => clothesSel.has(c.link)).slice(0, 16);
    const locationDupes = locCands.filter(c => locSel.has(c.link)).slice(0, 12);
    const body: any = { action: "update-look", id: lookId, alternatives, locationDupes };
    if (editClothesFile) { try { body.clothesImage = await fileToDataUrl(editClothesFile); } catch { /**/ } }
    if (editLocationFile) { try { body.locationImage = await fileToDataUrl(editLocationFile); } catch { /**/ } }
    const res = await fetch("/api/try-this-look", { method: "POST", headers: studioHeaders(), body: JSON.stringify(body) }).catch(() => null);
    if (!res || !res.ok) {
      const msg = res ? (await res.json().catch(() => null))?.error : "";
      setEditErr(msg || "Speichern fehlgeschlagen — Anmeldung/Pin prüfen.");
      setEditSaving("");
      return false;
    }
    // Only reflect the change in the UI once the server confirmed it (no optimistic
    // update that masks a failed save).
    setMyLooks(ls => ls.map(l => l.id === lookId ? { ...l, alternatives, locationDupes, altCount: alternatives.length, locationCount: locationDupes.length } : l));
    setEditSaving("");
    return true;
  };

  // Use an image already on the clipboard (e.g. a screenshot) as the garment reference.
  const useGarmentFile = (f: File) => { setAiGarmentFile(f); setAiResult(null); setAiError(""); };
  const pasteGarmentFromClipboard = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find(t => t.startsWith("image/"));
        if (type) {
          const blob = await item.getType(type);
          useGarmentFile(new File([blob], `screenshot.${type.split("/")[1] || "png"}`, { type }));
          return;
        }
      }
      setAiError("No image on the clipboard. Take a screenshot or copy an image first.");
    } catch {
      setAiError("Couldn't read the clipboard — paste with ⌘/Ctrl+V, or use Upload.");
    }
  };
  // While the AI panel is open with no garment yet, ⌘/Ctrl+V drops a pasted image straight in.
  useEffect(() => {
    if (mode !== "ai" || aiGarmentFile) return;
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find(file => file.type.startsWith("image/"));
      if (f) { e.preventDefault(); useGarmentFile(f); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [mode, aiGarmentFile]);

  useEffect(() => { setStyle(""); }, []);
  useEffect(() => {
    fetch("/api/curator?me=1", { headers: studioHeaders() }).then(r => r.json()).then((d: { curator?: any; credits?: any; costs?: any; justEarned?: any[] }) => {
      if (d.credits) setCredits(d.credits);
      if (d.costs) setCosts(d.costs);
      if (Array.isArray(d.justEarned) && d.justEarned.length) setJustEarned(d.justEarned);
      const c = d.curator;
      if (c) {
        if (c.photoUrl) setCuratorPhotoUrl(c.photoUrl);
        const split = (s?: string) => (s ?? "").split(/,\s*/).map(x => x.trim()).filter(Boolean);
        const groups = [
          { label: "For", tags: split(c.genderFocus) },
          { label: "Brands", tags: split(c.brands) },
          { label: "Style", tags: split(c.style) },
          { label: "Colors", tags: split(c.colors) },
          { label: "Fabrics", tags: split(c.fabrics) },
          { label: "Occasions", tags: split(c.occasions) },
          { label: "Price", tags: split(c.priceTiers) },
          { label: "Fit", tags: split(c.fitFocus) },
          { label: "Age", tags: split(c.ageFocus) },
        ].filter(g => g.tags.length);
        setMyFilters(groups);
        // Default: nothing selected — the curator taps to pick what they want.
      } else if (getStoredPin() && !getCuratorId()) {
        // House admin (PIN, not acting as a curator) — load the default house taste
        // so brands/styles still show in the form. Curators keep their own taste.
        setMyFilters(DEFAULT_HOUSE_FILTERS);
      }
    }).catch(() => {
      // Network/Supabase hiccup — still give the house admin a usable form.
      if (getStoredPin() && !getCuratorId()) setMyFilters(DEFAULT_HOUSE_FILTERS);
    });
    void loadMyLooks();
    void loadMyTryons();
  }, []);

  const toggleFilter = (tag: string) => {
    setActiveTags((prev) => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };
  const toggleMyLook = async (lookId: string, published: boolean) => {
    setMyLooks((ls) => ls.map(l => l.id === lookId ? { ...l, published } : l));
    await fetch("/api/curator", { method: "POST", headers: studioHeaders(), body: JSON.stringify({ action: "toggle-look", lookId, published }) }).catch(() => {});
  };
  const deleteMyLook = async (lookId: string, name: string) => {
    if (!window.confirm(`Delete "${name || "this look"}" permanently? This can't be undone.`)) return;
    setMyLooks((ls) => ls.filter(l => l.id !== lookId)); // optimistic
    await fetch("/api/curator", { method: "POST", headers: studioHeaders(), body: JSON.stringify({ action: "delete-look", lookId }) }).catch(() => {});
    void loadMyLooks();
  };

  // Curators reach this tool via /studio with a session (no admin PIN). Only
  // gate behind the PIN when there's neither a PIN nor a curator session — and
  // only after we've tried to adopt a curator session from a signed-in email.
  if (!pin && !getCuratorId()) {
    if (authResolving) return <div className="grid min-h-[100dvh] place-items-center bg-white"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;
    return <PinGate onSaved={setPin} />;
  }

  // A curator session present without an admin PIN → curator-facing chrome.
  const isCurator = !pin && !!getCuratorId();
  const curatorName = getCuratorName();
  // Admin "Act as": PIN + a curator id → posting in that curator's name.
  const actingAs = !!pin && !!getCuratorId();
  const exitActingAs = () => {
    try { localStorage.removeItem("lb_curator"); } catch { /* ignore */ }
    window.location.reload();
  };

  // Build the search from the active filters: one search per active brand
  // (refined by a couple of active style/colour terms), plus any free text.
  // A single mega-query of every tag returns nothing, so we fan out instead.
  const buildQueries = (): string[] => {
    const free = style.trim();
    const brandGroup = myFilters.find(g => g.label === "Brands")?.tags ?? [];
    const brandSet = new Set(brandGroup.map(b => b.toLowerCase()));
    const activeBrands = activeTags.filter(t => brandSet.has(t.toLowerCase()));
    const activeTerms = activeTags.filter(t => !brandSet.has(t.toLowerCase()));
    // Garment type leads the refinement, then free text + a couple taste terms.
    const refine = [pickedGarment, free, ...activeTerms.slice(0, 2)].filter(Boolean).join(" ").trim();
    const brands = pickedBrand ? [pickedBrand, ...activeBrands] : activeBrands;
    if (brands.length) return [...new Set(brands)].slice(0, 3).map(b => `${b} ${refine}`.trim());
    if (refine) return [refine];
    if (free) return [free];
    return [];
  };
  const canSearch = activeTags.length > 0 || !!pickedBrand || !!pickedGarment;

  const runDiscover = async (term?: string) => {
    if (term !== undefined) setStyle(term);
    const queries = term !== undefined ? [term.trim()].filter(Boolean) : buildQueries();
    if (!queries.length) return;
    // Identical filter set already fetched this session → reuse, spend nothing.
    const sig = JSON.stringify(queries);
    const cached = discoverClientCache.get(sig);
    if (cached) { setDiscoverItems(cached); setDiscoverError(""); setSearchInfo({ searched: 0, reused: queries.length }); return; }
    setDiscovering(true); setDiscoverError(""); setDiscoverItems([]); setSearchInfo(null);
    try {
      const res = await fetch("/api/discover", { method: "POST", headers: studioHeaders(), body: JSON.stringify({ queries }) });
      const data = await res.json();
      if (res.status === 402 || data.outOfCredits) {
        if (data.credits) setCredits(data.credits);
        setShowBuyCredits(true);
        setDiscoverError("");
        return;
      }
      if (!res.ok || data.error) { setDiscoverError(data.error || "Discovery failed."); return; }
      if (data.credits) setCredits(data.credits);
      const items = Array.isArray(data.items) ? data.items : [];
      discoverClientCache.set(sig, items);
      setDiscoverItems(items);
      setSearchInfo({ searched: data.searched ?? queries.length, reused: data.cached ?? 0 });
    } catch { setDiscoverError("Discovery failed."); }
    finally { setDiscovering(false); }
  };

  const addFromDiscovery = async (item: DiscoverItem) => {
    // Toggle: if already used, remove its draft + unmark.
    if (usedLinks.includes(item.link)) {
      setDrafts((d) => d.filter((x) => x.sourceUrl !== item.link));
      setUsedLinks((u) => u.filter((l) => l !== item.link));
      return;
    }
    setAdding(item.link); setDiscoverError("");
    try {
      const imageDataUrl = await thumbToDataUrl(item.thumbnail);
      const draft: Draft = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: item.title, price: item.price,
        sourceUrl: item.link, imageUrl: item.thumbnail, imageDataUrl,
      };
      setDrafts((d) => [draft, ...d]);
      setUsedLinks((u) => [...u, item.link]); // mark as used; stay in place
    } catch {
      setDiscoverError("Could not load that product image. Try another.");
    } finally { setAdding(""); }
  };

  const publishSelection = async (modelImage?: string) => {
    if (!drafts.length || publishing) return;
    setModelPickerOpen(false);
    setPublishing(true); setPublishResult("");
    setPublishProgress({ done: 0, total: drafts.length });
    let ok = 0;
    for (const d of drafts) {
      try {
        const r = await callPublish(d, d.name || "Trend Look", d.price, undefined, undefined, modelImage);
        ok++;
        // Model chosen → kick off the look video right away (Pixverse, async). We
        // don't wait for it; it finishes in the background and shows when ready.
        if (r.modelReady && r.lookId) {
          void fetch("/api/generate-look-video", {
            method: "POST", headers: studioHeaders(),
            body: JSON.stringify({ lookId: r.lookId }),
          }).catch(() => {});
        }
      } catch { /* skip failed item */ }
      setPublishProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setDrafts([]); setUsedLinks([]);
    setPublishing(false);
    setPublishResult(modelImage
      ? `${ok} look${ok === 1 ? "" : "s"} published — your model is wearing ${ok === 1 ? "it" : "them"}.`
      : `${ok} look${ok === 1 ? "" : "s"} published (product photo).`);
    void loadMyLooks();
    setTimeout(() => setPublishResult(""), 5000);
  };

  // One-click publish straight from the AI Fashion library — no "drafts" detour.
  // Checked looks go live under My Trends, with shop options from a reverse search.
  // Build ONE targeted garment query from the active filters: brand + colour + fabric
  // + a garment noun (so we get an actual gold satin dress, not a random top).
  const buildGarmentQuery = (): string => {
    const tagsIn = (label: string) => {
      const set = new Set((myFilters.find(g => g.label === label)?.tags ?? []).map(t => t.toLowerCase()));
      return activeTags.filter(t => set.has(t.toLowerCase()));
    };
    const brand = tagsIn("Brands")[0] ?? "";
    const colour = tagsIn("Colors")[0] ?? "";
    const fabric = tagsIn("Fabrics")[0] ?? "";
    const occasion = tagsIn("Occasions")[0] ?? "";
    // "gown" for black-tie/bridal/evening, else "dress".
    const noun = /black tie|bridal|evening|gala/i.test(occasion) ? "gown" : "dress";
    return [brand, colour, fabric, noun].filter(Boolean).join(" ").trim();
  };

  // Find a REAL brand product (e.g. an actual gold Tom Ford dress) and download its
  // image so we can feed it to the try-on as the garment reference — that's what makes
  // the generated look truly match the brand. Picks a RANDOM piece from the top hits so
  // repeated generations vary. Returns the file + the product, or null.
  const fetchBrandGarment = async (): Promise<{ file: File; product: any } | null> => {
    const q = buildGarmentQuery();
    if (!q) return null;
    try {
      const res = await fetch("/api/discover", { method: "POST", headers: studioHeaders(), body: JSON.stringify({ queries: [q], internal: true }) });
      const data = await res.json();
      if (data.credits) setCredits(data.credits);
      const items: any[] = (Array.isArray(data.items) ? data.items : []).filter((i: any) => i?.thumbnail && i?.link && isApparel(i?.title));
      // Shuffle the top hits so two generations with the same filters differ.
      const pool = items.slice(0, 8).sort(() => Math.random() - 0.5);
      for (const it of pool) {
        try {
          const imgRes = await fetch(`/api/img-proxy?url=${encodeURIComponent(it.thumbnail)}`);
          if (!imgRes.ok) continue;
          const blob = await imgRes.blob();
          if (!blob.type.startsWith("image/")) continue;
          return { file: new File([blob], "garment.png", { type: blob.type }), product: it };
        } catch { /* try next item */ }
      }
    } catch { /* ignore — fall back to text-only styling */ }
    return null;
  };

  // Turn a look's stored style tags ("Style it to match: Tom Ford, Satin, …") into
  // brand-aware shop queries, so the curator's chosen labels appear in the options.
  const brandQueriesFromPrompt = (genPrompt: string): string[] => {
    const tags = genPrompt.replace(/^.*?:\s*/, "").replace(/\.$/, "").split(/,\s*/).map(t => t.trim()).filter(Boolean);
    const brandGroup = myFilters.find(g => g.label === "Brands")?.tags ?? [];
    const brandSet = new Set(brandGroup.map(b => b.toLowerCase()));
    const brands = tags.filter(t => brandSet.has(t.toLowerCase()));
    const terms = tags.filter(t => !brandSet.has(t.toLowerCase()) && t.toLowerCase() !== "womenswear");
    const refine = terms.slice(0, 2).join(" ").trim();
    return brands.slice(0, 2).map(b => `${b} ${refine}`.trim());
  };

  const publishAiSelection = async () => {
    const selected = aiGenerations.filter(g => g.selected);
    if (!selected.length || publishing) return;
    setPublishing(true); setPublishResult("");
    setPublishProgress({ done: 0, total: selected.length });
    let ok = 0;
    const publishedIds: string[] = [];
    for (const gen of selected) {
      // No user-typed name → auto-generate a catchy title from the style filters.
      const name = gen.name.trim() || (await callName(gen.prompt)) || "AI Look";
      const draft: Draft = {
        id: gen.id, name,
        price: "", sourceUrl: "", imageUrl: "", imageDataUrl: gen.image,
      };
      try { await callPublish(draft, draft.name, "", brandQueriesFromPrompt(gen.prompt), gen.garmentProduct, undefined, (gen.description ?? "").trim()); ok++; publishedIds.push(gen.id); }
      catch { /* skip failed item */ }
      setPublishProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    // Remove the now-published looks from the library so it doesn't pile up.
    setAiGenerations(prev => prev.filter(g => !publishedIds.includes(g.id)));
    setPublishing(false);
    setPublishResult(`${ok} look${ok === 1 ? "" : "s"} published to Trends.`);
    void loadMyLooks();
    setTimeout(() => setPublishResult(""), 5000);
  };

  const runImport = async () => {
    const list = urls.split(/\s+/).map((u) => u.trim()).filter((u) => /^https?:\/\//i.test(u));
    if (!list.length) return;
    setImporting(true);
    setErrors([]);
    const results = await Promise.allSettled(list.map(callImport));
    const ok: Draft[] = [];
    const errs: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") ok.push(r.value);
      else errs.push(`${list[i]} — ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
    });
    setDrafts((d) => [...ok, ...d]);
    setErrors(errs);
    setImporting(false);
    setUrls("");
  };

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-ink" style={{ paddingBottom: drafts.length ? "170px" : "88px" }}>
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <header className="grid gap-2">
          <a href={isCurator ? "/stores" : "/admin"} className="inline-flex w-fit items-center gap-1.5 text-xs font-black text-ink/50 transition hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5" /> {isCurator ? "Back to LuxuryBandit" : "Back to dashboard"}
          </a>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-cobalt">
            {isCurator ? `LuxuryBandit Studio${curatorName ? ` · ${curatorName}` : ""}` : "LuxuryBandit Admin"}
          </div>
          <h1 className="text-3xl font-black leading-none text-ink">
            {isCurator ? `Welcome${curatorName ? `, ${curatorName}` : ""} — your studio` : "Trends"}
          </h1>
          <p className="max-w-2xl text-sm font-semibold leading-6 text-ink/55">
            {isCurator
              ? "Search by your style, tap a real product you love, and decide yes or no. That's the job."
              : "Produkt-Links von Partner-Shops einfügen → importieren → Ja/Nein. „Ja“ veröffentlicht den Look unter „LuxuryBandit“ in der Trends-Galerie, mit Shop-Optionen und Tryon."}
          </p>
        </header>

        {/* Who am I — always show the active identity, especially when an admin is
            acting in a curator's name (otherwise it's invisible who you post as). */}
        {!isCurator && (
          actingAs ? (
            <section className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-200 text-base">🎭</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-amber-800">Posting as {curatorName || "this curator"}</p>
                <p className="text-[11px] font-bold text-amber-700/80">Looks, comments & messages you create here go out in their name.</p>
              </div>
              <button type="button" onClick={exitActingAs}
                className="shrink-0 rounded-lg border border-amber-400 bg-white px-3 py-2 text-[11px] font-black text-amber-800 transition active:scale-[0.98] hover:bg-amber-100">
                Exit → back to Admin
              </button>
            </section>
          ) : (
            <section className="mt-4 flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3.5 shadow-soft">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cobalt/10 text-base">🛡️</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-ink">LuxuryBandit Admin (house)</p>
                <p className="text-[11px] font-bold text-ink/45">Looks you publish here go out under LuxuryBandit. To post as a curator, use “Act as” in Admin → Curators.</p>
              </div>
            </section>
          )
        )}

        {/* Credits — your allowance to prove yourself */}
        {isCurator && credits && (
          <section className={`mt-4 flex items-center gap-3 rounded-2xl border p-4 ${credits.credits <= 0 ? "border-red-200 bg-red-50" : "border-black/10 bg-white shadow-soft"}`}>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cobalt/10 text-xl">🪙</div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-black ${credits.credits <= 0 ? "text-red-600" : "text-ink"}`}>
                {credits.credits} credit{credits.credits === 1 ? "" : "s"} {credits.credits <= 0 ? "— you're out" : "left"}
              </p>
              <p className="text-[11px] font-bold text-ink/45">
                Try-on {costs?.tryon ?? 2} · search {costs?.search ?? 1} · earned {credits.earned} so far
              </p>
            </div>
            <button type="button" onClick={() => setShowBuyCredits(true)}
              className="shrink-0 rounded-full bg-black px-4 py-2 text-xs font-black text-white active:scale-95 transition">
              {credits.credits <= 0 ? "Get credits" : "How it works"}
            </button>
          </section>
        )}

        {/* Earn celebration — you proved yourself */}
        {isCurator && justEarned.length > 0 && (
          <section className="mt-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
            <p className="text-sm font-black text-emerald-700">🎉 You just earned {justEarned.reduce((s, a) => s + a.credits, 0)} credits!</p>
            <p className="mt-0.5 text-[11px] font-bold text-emerald-600">{justEarned.map(a => `${a.label} (+${a.credits})`).join(" · ")}</p>
            <button type="button" onClick={() => setJustEarned([])} className="mt-1.5 text-[11px] font-black text-emerald-700 underline">Keep going →</button>
          </section>
        )}

        {/* Favourite brands ONLY — quick pick above the tools. Everything else
            (brand search, garment, style, colours…) lives below the tools. */}
        {(() => {
          const fav = myFilters.find((g) => g.label === "Brands");
          if (!fav || !fav.tags.length) return null;
          return (
            <section className="mt-5 rounded-2xl border border-cobalt/20 bg-cobalt/[0.04] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cobalt">Favourite brands — tap to filter</p>
                <a href="/curators/profile" className="shrink-0 text-[11px] font-black text-cobalt hover:underline">+ Add / edit →</a>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {fav.tags.map((tag) => {
                  const active = pickedBrand === tag;
                  return (
                    <button key={tag} type="button" onClick={() => setPickedBrand(active ? "" : tag)}
                      className={`rounded-full px-3 py-1.5 text-xs font-black transition ${active ? "bg-black text-white" : "border border-black/12 bg-white text-ink/45 hover:border-black"}`}>{tag}</button>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* Choose how to create — one flow at a time, never both. (Import-by-link
            was removed for now — too fiddly; Find products + Create AI Fashion stay.) */}
        <section className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setMode(mode === "web" ? null : "web")}
            className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition active:scale-[0.99] ${mode === "web" ? "border-black bg-black text-white shadow-soft" : "border-black/12 bg-white text-ink hover:border-black/30"}`}>
            <Search className={`h-5 w-5 ${mode === "web" ? "text-white" : "text-ink/50"}`} />
            <span className="text-sm font-black">Find products online</span>
            <span className={`text-[11px] font-bold ${mode === "web" ? "text-white/70" : "text-ink/40"}`}>Search the web by your taste</span>
          </button>
          <button type="button" onClick={() => setMode(mode === "ai" ? null : "ai")}
            className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition active:scale-[0.99] ${mode === "ai" ? "border-black bg-black text-white shadow-soft" : "border-black/12 bg-white text-ink hover:border-black/30"}`}>
            <ImagePlus className={`h-5 w-5 ${mode === "ai" ? "text-white" : "text-ink/50"}`} />
            <span className="text-sm font-black">Create AI Fashion</span>
            <span className={`text-[11px] font-bold ${mode === "ai" ? "text-white/70" : "text-ink/40"}`}>Your photo on a model + garment → try-on</span>
          </button>
          {/* Upload an own finished reel (e.g. from Pixverse) as a feed funnel post. */}
          <button type="button" onClick={() => setMode(mode === "reel" ? null : "reel")}
            className={`col-span-2 flex items-center gap-2 rounded-xl border p-4 text-left transition active:scale-[0.99] ${mode === "reel" ? "border-black bg-black text-white shadow-soft" : "border-black/12 bg-white text-ink hover:border-black/30"}`}>
            <Upload className={`h-5 w-5 shrink-0 ${mode === "reel" ? "text-white" : "text-ink/50"}`} />
            <span className="min-w-0">
              <span className="block text-sm font-black">Reel hochladen</span>
              <span className={`block text-[11px] font-bold ${mode === "reel" ? "text-white/70" : "text-ink/40"}`}>Eigenes Video (MP4) → Feed-Post mit Try-on / Bandit</span>
            </span>
          </button>
        </section>

        {/* Reel-upload panel */}
        {mode === "reel" && (
          <section className="mt-4 rounded-2xl border border-black/10 bg-white p-5 shadow-soft">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cobalt">Reel hochladen</p>
            <p className="mt-1 text-[12px] font-medium text-ink/50">Lade dein fertiges Video (z. B. aus Pixverse) hoch. Es wird ein Feed-Post in deinem Namen — mit „Try This Look" + „Bandit the look".</p>
            <div className="mt-3 grid gap-3">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-black/15 bg-panel p-6 text-center transition hover:border-black/30 hover:bg-black/[0.03]">
                <Upload className="h-5 w-5 text-ink/30" />
                <span className="text-[12px] font-black text-ink/60">{reelFile ? reelFile.name : "Video wählen · MP4 · max 50 MB"}</span>
                <span className="text-[10px] font-bold text-ink/30">Hochformat (9:16) wirkt am besten</span>
                <input type="file" accept="video/*" className="sr-only" disabled={reelBusy}
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setReelFile(f); setReelErr(""); setReelMsg(""); } }} />
              </label>
              {/* The two reference images you used to make the reel → power "Bandit the look":
                  the garment finds similar looks for less, the place finds similar escapes. */}
              <div className="grid grid-cols-2 gap-2">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-black/15 bg-panel p-4 text-center transition hover:border-black/30">
                  <ImagePlus className="h-4 w-4 text-ink/30" />
                  <span className="text-[11px] font-black text-ink/55">{reelClothesFile ? "✓ Klamotten" : "Klamotten-Bild"}</span>
                  <span className="text-[9px] font-bold text-ink/30">→ ähnliche Looks günstig</span>
                  <input type="file" accept="image/*" className="sr-only" disabled={reelBusy}
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setReelClothesFile(f); setReelErr(""); } }} />
                </label>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-black/15 bg-panel p-4 text-center transition hover:border-black/30">
                  <ImagePlus className="h-4 w-4 text-ink/30" />
                  <span className="text-[11px] font-black text-ink/55">{reelLocationFile ? "✓ Location" : "Location-Bild"}</span>
                  <span className="text-[9px] font-bold text-ink/30">→ ähnliche Orte günstig</span>
                  <input type="file" accept="image/*" className="sr-only" disabled={reelBusy}
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setReelLocationFile(f); setReelErr(""); } }} />
                </label>
              </div>
              {/* Reliable location search for AI/generic places — a keyword beats
                  reverse-image search (which finds nothing on a rendered landscape). */}
              <PlaceSearchInput value={reelLocationQuery} onChange={setReelLocationQuery} disabled={reelBusy}
                placeholder="z. B. „Greece, Thailand“ — mehrere mit Komma"
                className="h-10 w-full rounded-md border border-black/10 bg-panel px-3 text-sm font-semibold text-ink outline-none focus:border-cobalt disabled:opacity-60" />
              <p className="-mt-1 text-[10px] font-bold text-ink/35">Mehrere Orte mit Komma: <code>Greece, Thailand</code> sucht beide (ersetzt die Liste). Mit <code>+</code> pro Ort (<code>+Thailand, +Greece</code>) wird stattdessen <b>hinzugefügt</b>. (max. 5 pro Suche)</p>
              {/* Search the SerpApi candidates now → tick which appear in "Bandit the look". */}
              {(reelClothesFile || reelLocationFile || reelLocationQuery.trim()) && (
                <button type="button" onClick={() => void runReelSearch()} disabled={reelSearching || reelBusy}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-cobalt bg-cobalt/5 text-[12px] font-black text-cobalt disabled:opacity-50">
                  {reelSearching ? <><Loader2 className="h-4 w-4 animate-spin" /> Suche läuft…</> : <><Search className="h-4 w-4" /> Treffer suchen & auswählen</>}
                </button>
              )}
              {reelClothesCands.length > 0 && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-ink/45">Klamotten — anhaken, was ins Reel soll ({reelClothesSel.size})</p>
                  <div className="mt-1.5 flex flex-col gap-1.5">
                    {reelClothesCands.map(c => candRow(c, reelClothesSel.has(c.link), () => toggleIn(setReelClothesSel, c.link)))}
                  </div>
                </div>
              )}
              {reelLocCands.length > 0 && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-ink/45">Orte — anhaken, was ins Reel soll ({reelLocSel.size})</p>
                  <div className="mt-1.5 flex flex-col gap-1.5">
                    {reelLocCands.map(c => candRow(c, reelLocSel.has(c.link), () => toggleIn(setReelLocSel, c.link)))}
                  </div>
                </div>
              )}
              <div className="grid gap-1.5">
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-ink/40">Beschreibung <span className="font-bold text-ink/30">· öffentlicher Titel</span></span>
                <textarea value={reelDesc} onChange={e => setReelDesc(e.target.value)} disabled={reelBusy}
                  placeholder="z. B. Silbernes Slip-Dress für laue Sommernächte…"
                  className="min-h-20 rounded-md border border-black/10 bg-panel p-3 text-sm font-semibold text-ink outline-none focus:border-cobalt disabled:opacity-60" />
                {(() => { const b = findBrandsInText(reelDesc); return b.length > 0 ? (
                  <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold leading-snug text-amber-700">⚠️ Markenname erkannt: <span className="font-black">{b.join(", ")}</span>. Als Curator bitte entfernen (Lizenz).</p>
                ) : null; })()}
              </div>
              <div className="grid gap-1.5">
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-ink/40">Kategorie</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {LOOK_CATEGORIES.map((c) => (
                    <button key={c.slug} type="button" disabled={reelBusy} onClick={() => setReelCategory(c.slug)}
                      className={`rounded-md border px-3 py-2 text-left text-sm font-bold transition disabled:opacity-60 ${reelCategory === c.slug ? "border-black bg-black text-white" : "border-black/10 bg-panel text-ink hover:border-black/30"}`}>
                      {c.slug === "boudoir" ? "🔒 " : ""}{c.label}
                    </button>
                  ))}
                </div>
              </div>
              {(reelClothesCands.length > 0 || reelLocCands.length > 0) && (
                <button type="button" onClick={runReelAnalysis} disabled={reelBusy}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-amber-400 bg-amber-50 text-[12px] font-black text-amber-700 disabled:opacity-50">
                  <Wand2 className="h-4 w-4" /> Analyse & Korrektur (Blindtext, tote Links, Nicht-Buchungs-Orte)
                </button>
              )}
              {reelAuditMsg && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-snug text-amber-700">{reelAuditMsg}</p>}
              {reelErr && <p className="text-xs font-bold text-coral">{reelErr}</p>}
              {reelMsg && <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs font-black text-green-700">{reelMsg}</p>}
              <button type="button" onClick={() => void publishReel()} disabled={reelBusy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white active:scale-[0.99] transition disabled:opacity-50">
                {reelBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> {reelStep || "Wird gepostet…"}</> : <><Upload className="h-4 w-4" /> Reel in den Feed posten</>}
              </button>
            </div>
          </section>
        )}

        {/* The rest of the taste filters — brand search, garment & style. Below the
            tools, shown once Find products / Create AI Fashion is active. */}
        {(mode === "web" || mode === "ai") && myFilters.length > 0 && (
          <section className="mt-5 rounded-2xl border border-cobalt/20 bg-cobalt/[0.04] p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cobalt">Refine — brand · garment · style</p>
            <div className="mt-3 grid gap-3">
              {/* Brand — searchable dropdown; pick from the official list or add one */}
              <div>
                <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-ink/35">Brand</span>
                {pickedBrand ? (
                  <div className="mt-1 flex items-center justify-between rounded-md border border-black bg-black px-3 py-2">
                    <span className="text-xs font-black text-white">{pickedBrand}</span>
                    <button type="button" onClick={() => { setPickedBrand(""); setBrandQuery(""); }} className="text-white/70 hover:text-white"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <div className="relative mt-1">
                    <input value={brandQuery} onChange={(e) => { setBrandQuery(e.target.value); setBrandOpen(true); }}
                      onFocus={() => setBrandOpen(true)} onBlur={() => setTimeout(() => setBrandOpen(false), 150)}
                      placeholder="Search a brand…"
                      className="w-full rounded-md border border-black/12 bg-white px-3 py-2 text-xs font-black text-ink placeholder:font-bold placeholder:text-ink/35" />
                    {brandOpen && (() => {
                      const q = brandQuery.trim().toLowerCase();
                      const matches = (q ? BRAND_OPTIONS.filter(b => b.toLowerCase().includes(q)) : BRAND_OPTIONS).slice(0, 8);
                      const exact = BRAND_OPTIONS.some(b => b.toLowerCase() === q);
                      if (!matches.length && !q) return null;
                      return (
                        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-black/12 bg-white shadow-lg">
                          {matches.map((b) => (
                            <button key={b} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setPickedBrand(b); setBrandQuery(""); setBrandOpen(false); }}
                              className="block w-full px-3 py-2 text-left text-xs font-black text-ink hover:bg-black/5">{b}</button>
                          ))}
                          {q && !exact && (
                            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setPickedBrand(brandQuery.trim()); setBrandQuery(""); setBrandOpen(false); }}
                              className="block w-full border-t border-black/8 px-3 py-2 text-left text-xs font-black text-cobalt hover:bg-cobalt/5">+ Add “{brandQuery.trim()}”</button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              {/* Garment type — tap one to target the search */}
              <div>
                <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-ink/35">Garment</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {GARMENT_TYPES.map((gm) => {
                    const active = pickedGarment === gm;
                    return (
                      <button key={gm} type="button" onClick={() => setPickedGarment(active ? "" : gm)}
                        className={`rounded-full px-3 py-1.5 text-xs font-black transition ${active ? "bg-black text-white" : "border border-black/12 bg-white text-ink/45 hover:border-black"}`}>{gm}</button>
                    );
                  })}
                </div>
              </div>
              {myFilters.map((g) => {
                // Brands are shown above the tools (as "Favourite brands"); skip here.
                if (g.label === "Brands") return null;
                return (
                  <div key={g.label}>
                    <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-ink/35">{g.label}</span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {g.tags.map((tag) => {
                        const active = activeTags.includes(tag);
                        return (
                          <button key={tag} type="button" onClick={() => toggleFilter(tag)}
                            className={`rounded-full px-3 py-1.5 text-xs font-black transition ${active ? "bg-black text-white" : "border border-black/12 bg-white text-ink/45 hover:border-black"}`}>{tag}</button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Find products — driven by the active filters above */}
        {mode === "web" && (
        <section className="mt-5 rounded-lg border border-black/10 bg-white p-5 shadow-soft">
          <button type="button" onClick={() => runDiscover()} disabled={discovering || !canSearch}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-black text-sm font-black text-white transition active:scale-[0.99] disabled:opacity-40">
            {discovering
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Searching…</>
              : <><Search className="h-4 w-4" /> Find products · up to {Math.max(1, Math.min(buildQueries().length, 3))} credit{Math.max(1, Math.min(buildQueries().length, 3)) === 1 ? "" : "s"}</>}
          </button>
          <p className="mt-2 text-[11px] font-bold text-ink/40">Searches the web for products that match your active filters above. Tap a product to add it; tap again to remove. Then publish your selection.</p>
          {searchInfo ? (
            <p className="mt-1.5 text-[11px] font-black text-emerald-600">
              {searchInfo.searched === 0
                ? "Reused cached results · 0 credits used 🎉"
                : `Used ${searchInfo.searched} credit${searchInfo.searched === 1 ? "" : "s"}${searchInfo.reused ? ` · ${searchInfo.reused} reused free` : ""}`}
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] font-bold text-ink/30">
              1 credit per brand (max 3). Same filters = reused free.
            </p>
          )}
          {discoverError && <p className="mt-2 text-xs font-bold text-coral">{discoverError}</p>}
          {discoverItems.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {discoverItems.map((item) => {
                const used = usedLinks.includes(item.link);
                return (
                <button key={item.link} type="button" onClick={() => void addFromDiscovery(item)} disabled={!!adding}
                  className={`group overflow-hidden rounded-lg border bg-white text-left transition active:scale-[0.98] disabled:opacity-60 ${used ? "border-emerald-400 ring-2 ring-emerald-400" : "border-black/10"}`}>
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-panel">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.thumbnail} alt="" className={`h-full w-full object-cover transition ${used ? "opacity-55" : ""}`} />
                    {item.fromPartner && item.source && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-cobalt px-1.5 py-0.5 text-[9px] font-black text-white shadow">{item.source}</span>
                    )}
                    {used && (
                      <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white shadow"><Check className="h-3.5 w-3.5" /></span>
                    )}
                    {adding === item.link && (
                      <div className="absolute inset-0 grid place-items-center bg-black/40"><Loader2 className="h-5 w-5 animate-spin text-white" /></div>
                    )}
                    <div className={`absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 py-1 text-[10px] font-black text-white transition ${used ? "bg-emerald-500/90 opacity-100" : "bg-black/65 opacity-0 group-hover:opacity-100"}`}>
                      {used ? <><Check className="h-3 w-3" /> Added · tap to remove</> : <><Plus className="h-3 w-3" /> Use this</>}
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 text-[11px] font-bold leading-4 text-ink/80">{item.title}</p>
                    {item.price && <p className="mt-0.5 text-xs font-black text-ink">{item.price}</p>}
                  </div>
                </button>
                );
              })}
            </div>
          )}
        </section>
        )}

        {/* Create AI Fashion — virtual try-on using garment + person photo */}
        {mode === "ai" && (
        <section className="mt-5 rounded-lg border border-black/10 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <ImagePlus className="h-4 w-4 text-ink/50" />
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-ink/45">Create AI Fashion</span>
            <span className="ml-auto rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] font-black text-ink/50">{costs?.tryon ?? 2} credits</span>
          </div>

          <div className="flex flex-col gap-3">
            {/* Person photo — the base, required */}
            {aiPersonFile ? (
              <div className="rounded-xl border border-black/12 bg-panel p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(aiPersonFile)} alt="Your photo" className="mx-auto max-h-72 w-auto max-w-full rounded-lg object-contain" />
                <p className="mt-2 truncate text-center text-[10px] font-bold text-ink/40">{aiPersonFile.name}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => setCropTarget("person")}
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-black/12 text-[11px] font-black text-ink/60 transition active:bg-black/5">
                    <Crop className="h-3.5 w-3.5" /> Crop
                  </button>
                  <button type="button" onClick={() => { setAiPersonFile(null); setAiResult(null); }}
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-coral/30 text-[11px] font-black text-coral transition active:bg-coral/5">
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-ink/45">Model photo</span>
                {curatorPhotoUrl && (
                  <button type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch(curatorPhotoUrl);
                        const blob = await res.blob();
                        setAiPersonFile(new File([blob], "profile.jpg", { type: blob.type || "image/jpeg" }));
                        setAiResult(null); setAiError("");
                      } catch { setAiError("Couldn't load your profile photo."); }
                    }}
                    className="flex h-11 w-full items-center justify-center gap-3 rounded-lg bg-black text-sm font-black text-white transition active:bg-black/90">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={curatorPhotoUrl} alt="Profile" className="h-6 w-6 rounded-full object-cover" />
                    Use my profile photo
                  </button>
                )}
                <label className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-black/15 bg-panel p-6 text-center transition cursor-pointer hover:border-black/30 hover:bg-black/[0.03]">
                  <ImagePlus className="h-6 w-6 text-ink/30" />
                  <span className="text-[11px] font-black text-ink/50">{curatorPhotoUrl ? "Or upload another photo" : "Upload a photo"}</span>
                  <span className="text-[10px] font-bold text-ink/30">tap to upload</span>
                  <input type="file" accept="image/*" className="sr-only"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setAiPersonFile(f); setAiResult(null); setAiError(""); } }} />
                </label>
              </div>
            )}

            {/* Garment photo or video — optional reference */}
            {aiGarmentFile ? (
              <div className="rounded-xl border border-black/12 bg-panel p-2">
                {aiGarmentFile.type.startsWith("video") ? (
                  <video src={URL.createObjectURL(aiGarmentFile)} controls playsInline className="mx-auto max-h-56 w-auto max-w-full rounded-lg object-contain" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={URL.createObjectURL(aiGarmentFile)} alt="Garment" className="mx-auto max-h-56 w-auto max-w-full rounded-lg object-contain" />
                )}
                <p className="mt-2 truncate text-center text-[10px] font-bold text-ink/40">{aiGarmentFile.name}</p>
                <div className="mt-2 flex gap-2">
                  {!aiGarmentFile.type.startsWith("video") && (
                    <button type="button" onClick={() => setCropTarget("garment")}
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-black/12 text-[11px] font-black text-ink/60 transition active:bg-black/5">
                      <Crop className="h-3.5 w-3.5" /> Crop
                    </button>
                  )}
                  <button type="button" onClick={() => { setAiGarmentFile(null); setAiResult(null); }}
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-coral/30 text-[11px] font-black text-coral transition active:bg-coral/5">
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-black/15 bg-panel p-6 text-center transition cursor-pointer hover:border-black/30 hover:bg-black/[0.03]">
                  <ImagePlus className="h-5 w-5 text-ink/30" />
                  <span className="text-[11px] font-black text-ink/50">Garment photo / video <span className="font-bold text-ink/30">· optional</span></span>
                  <span className="text-[10px] font-bold text-ink/30">add a photo or video to copy a specific item</span>
                  <input type="file" accept="image/*,video/*" className="sr-only"
                    onChange={e => { const f = e.target.files?.[0]; if (f) { setAiGarmentFile(f); setAiResult(null); setAiError(""); } }} />
                </label>
                <button type="button" onClick={pasteGarmentFromClipboard}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-black/12 bg-white text-[12px] font-black text-ink/60 transition active:bg-black/5 hover:border-black/30">
                  <ClipboardPaste className="h-4 w-4" /> Paste screenshot <span className="font-bold text-ink/30">(⌘/Ctrl+V)</span>
                </button>
              </div>
            )}
          </div>

          {/* Active taste filters that will shape the styling prompt */}
          {activeTags.length > 0 && (
            <p className="mt-3 text-[11px] font-bold text-ink/45">
              Styled to your active filters: <span className="font-black text-ink/65">{activeTags.join(" · ")}</span>
            </p>
          )}

          {/* Optional prompt */}
          <input type="text" placeholder="Optional: add scene, background, mood…" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
            className="mt-2 w-full rounded-lg border border-black/10 bg-panel px-3 py-2 text-[12px] font-bold text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-cobalt/30" />

          {/* Lingerie / swim → uses FASHN (OpenAI won't do revealing pieces). Auto-detected
              from garment/brand; toggle to force on/off. */}
          {(() => {
            const auto = isIntimateName([pickedGarment, pickedBrand, ...activeTags].join(" "));
            const on = aiLingerieManual ?? auto;
            return (
              <button type="button" onClick={() => setAiLingerieManual(on ? false : true)}
                className="mt-2 flex w-full items-center justify-between rounded-lg border border-black/10 bg-panel px-3 py-2 text-[12px] font-black text-ink/70">
                <span>Lingerie / swimwear {aiLingerieManual === null && auto ? <span className="font-bold text-ink/40">· auto-detected</span> : null}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${on ? "bg-black text-white" : "bg-black/10 text-ink/50"}`}>{on ? "On · FASHN" : "Off"}</span>
              </button>
            );
          })()}

          {/* Generate button */}
          <button type="button"
            disabled={!aiPersonFile || aiGenerating}
            onClick={async () => {
              if (!aiPersonFile) return;
              setAiGenerating(true); setAiError(""); setAiResult(null); setAiUsedProduct(null);
              try {
                // No garment uploaded but a brand is active → fetch a REAL brand
                // product image and use it as the garment, so the look actually
                // looks like that brand (not a generic dress).
                let garmentFile = aiGarmentFile;
                let usedProduct: any = null;
                const brandLc = (myFilters.find(g => g.label === "Brands")?.tags ?? []).map(b => b.toLowerCase());
                const hasActiveBrand = activeTags.some(t => brandLc.includes(t.toLowerCase()));
                if (!garmentFile && hasActiveBrand) {
                  setAiFindingGarment(true);
                  const found = await fetchBrandGarment();
                  setAiFindingGarment(false);
                  if (found) { garmentFile = found.file; usedProduct = found.product; setAiUsedProduct(found.product); }
                }
                const fd = new FormData();
                if (garmentFile) fd.append("image", garmentFile);
                fd.append("modelImage", aiPersonFile);
                // Same taste filters as Find products feed the styling prompt.
                // Drop terms that trip OpenAI's safety classifier (e.g. "Provocative")
                // so a harmless luxury-styling request isn't flagged as sexual.
                const BLOCKED_STYLE_TERMS = /\b(provocative|sexy|seductive|revealing|sensual|risqu[eé]|naughty|lingerie|nude|naked)\b/i;
                const safeTags = activeTags.filter(t => !BLOCKED_STYLE_TERMS.test(t));
                const tasteHint = safeTags.length ? `Style it to match: ${safeTags.join(", ")}.` : "";
                const fullPrompt = [tasteHint, aiPrompt.trim()].filter(Boolean).join(" ");
                // Lingerie/swim → FASHN (OpenAI refuses or covers it up). Auto-detected
                // from the picked garment/brand/taste; the manual toggle overrides.
                const lingerie = aiLingerieManual ?? isIntimateName([pickedGarment, pickedBrand, ...activeTags].join(" "));
                fd.append("curatorId", getCuratorId());
                let res: Response;
                if (lingerie) {
                  fd.append("mode", "fashion-model");
                  fd.append("prompt", fullPrompt || "Tasteful editorial fashion photo of the person wearing the garment, clean studio lighting.");
                  res = await fetch("/api/generate-fashn", { method: "POST", body: fd });
                } else {
                  if (fullPrompt) fd.append("prompt", fullPrompt);
                  res = await fetch("/api/generate-openai-tryon", { method: "POST", body: fd });
                }
                const data = await res.json();
                if (data.credits) setCredits(data.credits);
                if (!res.ok || !data.image) { setAiError(data.error ?? "Generation failed."); return; }
                setAiResult(data.image);
                setAiUsedProduct(usedProduct);
              } catch (e) {
                setAiError(e instanceof Error ? e.message : "Generation failed.");
              } finally {
                setAiGenerating(false); setAiFindingGarment(false);
              }
            }}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-black text-sm font-black text-white transition active:scale-[0.99] disabled:opacity-40">
            {aiGenerating
              ? <><Loader2 className="h-4 w-4 animate-spin" /> {aiFindingGarment ? "Finding a real brand piece…" : "Generating…"}</>
              : <><Wand2 className="h-4 w-4" /> Create AI Fashion · {costs?.tryon ?? 2} credits</>}
          </button>
          {aiError && (
            /(safety|sexual)/i.test(aiError) ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-black text-amber-800">Foto vom Sicherheitsfilter blockiert</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-amber-700">
                  Das passiert bei Strand-/Bikini-Fotos mit viel Haut. Schneide das Foto eng aufs Gesicht zu — das KI-Bild wird ohnehin komplett neu angezogen, das Gesicht reicht als Vorlage.
                </p>
                {aiPersonFile && (
                  <button type="button" onClick={() => { setAiError(""); setCropTarget("person"); }}
                    className="mt-2 inline-flex h-9 items-center gap-2 rounded-md bg-amber-600 px-3 text-xs font-black text-white transition active:bg-amber-700">
                    <Crop className="h-3.5 w-3.5" /> Aufs Gesicht zuschneiden
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs font-bold text-coral">{aiError}</p>
            )
          )}

          {/* Result */}
          {aiResult && (
            <div className="mt-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={aiResult} alt="AI Fashion" className="w-full rounded-xl object-cover shadow-md" />
              {aiUsedProduct && (
                <p className="mt-2 text-[11px] font-bold text-ink/50">Worn: <span className="text-ink/70">{aiUsedProduct.title}</span>{aiUsedProduct.source ? ` · ${aiUsedProduct.source}` : ""} — guaranteed as a shop option.</p>
              )}
              <button type="button" onClick={() => {
                setAiGenerations(prev => [...prev, { id: `ai-${Date.now()}`, image: aiResult, prompt: activeTags.length ? `Style it to match: ${activeTags.join(", ")}.` : "", name: "", selected: false, garmentProduct: aiUsedProduct ?? undefined }]);
                setAiResult(null); setAiPersonFile(null); setAiGarmentFile(null); setAiPrompt(""); setAiUsedProduct(null);
              }}
                className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-black text-white transition active:bg-emerald-700">
                <Plus className="h-4 w-4" /> Add to gallery
              </button>
            </div>
          )}
        </section>
        )}

        {/* AI Fashion gallery — all generated looks stay here until deleted or published */}
        {aiGenerations.length > 0 && (
        <section className="mt-5 rounded-lg border border-black/10 bg-white p-5 shadow-soft">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-amber-700">Not published yet</span>
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-ink/45">AI Fashion library · {aiGenerations.filter(g => g.selected).length} selected</span>
            </div>
            <p className="mt-1.5 text-xs font-medium text-ink/50">Drafts waiting to go live. Tick the ones you want, hit publish — they move down into <span className="font-black text-ink/70">Active online</span> and disappear from here.</p>
          </div>
          {(() => {
            // One click → live under My Trends. Name is optional (falls back to a
            // generic title); the description, if added, becomes the look's name.
            const selected = aiGenerations.filter(g => g.selected);
            return (
              <button type="button"
                disabled={selected.length === 0 || publishing}
                onClick={() => void publishAiSelection()}
                className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-black text-white transition active:bg-emerald-700 disabled:opacity-40">
                {publishing
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Publishing… {publishProgress.done}/{publishProgress.total}</>
                  : <><Check className="h-4 w-4" /> Publish {selected.length} to My Trends</>}
              </button>
            );
          })()}
          {publishResult && (
            <p className="mb-4 -mt-2 text-center text-xs font-black text-emerald-600">{publishResult}</p>
          )}
          <div className="space-y-3">
            {aiGenerations.map((gen) => (
              <div key={gen.id} className="flex gap-3 rounded-lg border border-black/10 bg-panel p-3">
                <label className="flex flex-1 items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={gen.selected} onChange={e => {
                    setAiGenerations(prev => prev.map(g => g.id === gen.id ? { ...g, selected: e.target.checked } : g));
                  }} className="mt-1.5 h-4 w-4" />
                  <div className="flex flex-1 gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={gen.image} alt="AI generation" className="h-20 w-16 rounded object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <input type="text" placeholder="Name this look (e.g. 'Evening Gown - Black Silk')" value={gen.name}
                        onChange={e => setAiGenerations(prev => prev.map(g => g.id === gen.id ? { ...g, name: e.target.value } : g))}
                        className="w-full text-sm font-bold text-ink bg-transparent border-b border-black/10 px-0 py-1 focus:outline-none focus:border-black/30" />
                      <textarea placeholder="Description (shown to shoppers). Leave empty to auto-write one." value={gen.description ?? ""}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setAiGenerations(prev => prev.map(g => g.id === gen.id ? { ...g, description: e.target.value } : g))}
                        rows={2} maxLength={800}
                        className="mt-1.5 w-full resize-none rounded-md border border-black/10 bg-white px-2 py-1.5 text-[11px] leading-snug text-ink/80 outline-none focus:border-cobalt placeholder:text-ink/35" />
                      {gen.prompt && <p className="mt-1 text-[10px] font-bold text-ink/40 line-clamp-2">{gen.prompt}</p>}
                    </div>
                  </div>
                </label>
                <button type="button" onClick={() => setAiGenerations(prev => prev.filter(g => g.id !== gen.id))}
                  className="grid h-8 w-8 place-items-center rounded text-coral hover:bg-coral/10 transition flex-shrink-0">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
        )}

        {/* Crop modal */}
        {cropTarget && (cropTarget === "person" ? aiPersonFile : aiGarmentFile) && (
          <CropModal
            file={(cropTarget === "person" ? aiPersonFile : aiGarmentFile)!}
            onCancel={() => setCropTarget(null)}
            onApply={(f) => {
              if (cropTarget === "person") setAiPersonFile(f); else setAiGarmentFile(f);
              setAiResult(null);
              setCropTarget(null);
            }}
          />
        )}

        {/* My try-ons — the creator's own try-on photos + videos (separate from
            looks). View, download, and post/unpost from the look's feed. */}
        {myTryons.length > 0 && (
          <section className="mt-5 rounded-lg border border-black/10 bg-white p-5 shadow-soft">
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-violet-700">My try-ons</span>
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-ink/45">{myTryons.filter(t => t.videoUrl).length} with video · {myTryons.length} total</span>
              </div>
              <p className="mt-1.5 text-xs font-medium text-ink/50">Every try-on you make is saved here — nothing gets lost. Toggle <span className="font-black text-ink/70">In feed</span> to show/hide it on the look, download the file, or open it.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {myTryons.map((t) => (
                <div key={t.id} className="overflow-hidden rounded-lg border border-black/10 bg-panel">
                  <div className="relative aspect-[3/4] bg-black/5">
                    {t.videoUrl ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video src={t.videoUrl} poster={t.imageUrl || undefined} controls playsInline className="h-full w-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.imageUrl} alt={t.lookName} className="h-full w-full object-cover" />
                    )}
                    {t.videoUrl && (
                      <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                        <Video className="h-2.5 w-2.5" /> Video
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-[11px] font-bold text-ink/70">{t.lookName || "Try-on"}</p>
                    <div className="mt-1.5 flex items-center justify-between gap-1">
                      {t.lockedByAdmin && !studioIsAdmin() ? (
                        <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-rose-600" title="Deactivated by an admin — only an admin can reactivate it.">
                          <Lock className="h-3 w-3" /> Deactivated
                        </span>
                      ) : (
                        <button type="button"
                          disabled={tryonFeedBusy === t.id}
                          onClick={() => void toggleTryonFeed(t.id, !t.feed)}
                          title={t.lockedByAdmin ? "Admin-deactivated — reactivating as admin" : undefined}
                          className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide transition disabled:opacity-50 ${t.feed ? "bg-emerald-500 text-white" : t.lockedByAdmin ? "bg-rose-100 text-rose-600" : "bg-black/10 text-ink/55"}`}>
                          {tryonFeedBusy === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : t.lockedByAdmin ? <Lock className="h-3 w-3" /> : null}
                          {t.feed ? "In feed" : t.lockedByAdmin ? "Deactivated" : "Hidden"}
                        </button>
                      )}
                      <a href={t.videoUrl || t.imageUrl} download target="_blank" rel="noopener noreferrer"
                        className="grid h-7 w-7 place-items-center rounded text-ink/55 transition hover:bg-black/5" title="Open / download">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Active online — the curator's published looks, with on/off */}
        {myLooks.length > 0 && (
          <section className="mt-5 rounded-lg border border-black/10 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700">Live</span>
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-ink/45">Active online</span>
              </span>
              <span className="text-[11px] font-bold text-ink/40">{myLooks.filter((l) => l.published).length} live · {myLooks.length} total</span>
            </div>
            <p className="mt-1 text-[11px] font-bold text-ink/40">Everything you've published — these show in My Trends. Deactivate to take a look offline without deleting it.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {myLooks.map((l, idx) => {
                const lookSlug = l.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                const lookHref = `/look/${lookSlug}--${l.id}`;
                return (
                <div key={l.id} className={`overflow-hidden rounded-lg border border-black/10 transition ${l.published ? "" : "opacity-70"}`}>
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-panel">
                    {l.videoUrl ? (
                      // The uploaded/generated reel — playable right here so you can review it.
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video src={l.videoUrl} poster={l.imageUrl || undefined} controls playsInline className="h-full w-full object-cover object-top" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.imageUrl} alt={l.name} className="h-full w-full cursor-pointer object-cover object-top" onClick={() => window.open(lookHref, "_blank")} />
                    )}
                    {l.videoUrl && (
                      <a href={lookHref} target="_blank" rel="noopener noreferrer" title="Im Feed öffnen"
                        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur active:scale-90"><ExternalLink className="h-3.5 w-3.5" /></a>
                    )}
                    {!l.published && (
                      <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/55">
                        <span className="rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">Off</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    {/* Public title (curator description), never the raw brand product name. */}
                    <p className="line-clamp-1 text-[11px] font-bold text-ink/80">{l.note || l.description || "Luxury look"}</p>
                    {/* Real feed insights (not the seeded social-proof counts). */}
                    {(() => {
                      const clicks = Object.values(l.clicks ?? {}).reduce((s, n) => s + (n as number), 0);
                      const cells: [string, number][] = [["👁", l.viewCount ?? 0], ["❤️", l.likeCount ?? 0], ["✨", l.tryOnCount ?? 0], ["🛍", clicks], ["💬", l.commentCount ?? 0]];
                      return (
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-black text-ink/55">
                          {cells.map(([icon, n]) => <span key={icon} className={n > 0 ? "text-ink/80" : ""}>{icon} {n}</span>)}
                        </div>
                      );
                    })()}
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {/* Feed order */}
                      <div className="flex shrink-0 flex-col">
                        <button type="button" onClick={() => void moveLook(l.id, -1)} disabled={idx === 0} aria-label="Move up"
                          className="grid h-3.5 w-7 place-items-center rounded-t-md bg-black/5 text-ink/50 disabled:opacity-25 active:bg-black/10"><ChevronUp className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => void moveLook(l.id, 1)} disabled={idx === myLooks.length - 1} aria-label="Move down"
                          className="grid h-3.5 w-7 place-items-center rounded-b-md bg-black/5 text-ink/50 disabled:opacity-25 active:bg-black/10"><ChevronDown className="h-3.5 w-3.5" /></button>
                      </div>
                      <button type="button" onClick={() => openEdit(l)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-black py-1.5 text-[11px] font-black text-white transition active:scale-95">
                        <Pencil className="h-3 w-3" /> Bearbeiten
                      </button>
                      <button type="button" onClick={() => void toggleMyLook(l.id, !l.published)}
                        className={`shrink-0 rounded-md px-2 py-1.5 text-[11px] font-black transition active:scale-95 ${l.published ? "bg-black/5 text-ink/60 hover:bg-black/10" : "bg-emerald-500 text-white"}`}>
                        {l.published ? "Off" : "On"}
                      </button>
                      <button type="button" onClick={() => void deleteMyLook(l.id, l.name)} aria-label="Delete look"
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-black/5 text-ink/40 transition hover:bg-red-50 hover:text-red-500 active:scale-95">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {/* ── Edit sheet (opened by Bearbeiten) ── */}
                  {editingLookId === l.id && (() => {
                      const draft = noteDrafts[l.id] ?? l.note ?? "";
                      const dirty = draft.trim() !== (l.note ?? "").trim();
                      return (
                      <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setEditingLookId(null)}>
                        <div className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
                            <span className="flex items-center gap-2 text-sm font-black text-ink"><Pencil className="h-4 w-4" /> Post bearbeiten</span>
                            <button type="button" onClick={() => setEditingLookId(null)} className="grid h-8 w-8 place-items-center rounded-full text-ink/40 active:bg-black/5"><X className="h-5 w-5" /></button>
                          </div>
                          <div className="flex-1 overflow-y-auto p-4">
                          {/* media preview */}
                          {l.videoUrl ? (
                            // eslint-disable-next-line jsx-a11y/media-has-caption
                            <video key={l.videoUrl} src={l.videoUrl} poster={l.imageUrl || undefined} controls playsInline className="mb-3 max-h-72 w-full rounded-xl bg-black object-contain" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={l.imageUrl} alt="" className="mb-3 max-h-72 w-full rounded-xl object-contain" />
                          )}
                          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-ink/40">Beschreibung</span>
                          <textarea
                            value={draft}
                            onChange={(e) => setNoteDrafts(d => ({ ...d, [l.id]: e.target.value }))}
                            placeholder="Your thoughts on this look… (shown to shoppers)"
                            rows={2}
                            maxLength={600}
                            className="w-full resize-none rounded-md border border-black/10 bg-panel px-2 py-1.5 text-[11px] leading-snug text-ink/80 outline-none focus:border-cobalt placeholder:text-ink/30" />
                          {dirty && (
                            <button type="button" onClick={() => void saveLookNote(l.id)} disabled={savingNote === l.id}
                              className="mt-1 flex h-7 w-full items-center justify-center gap-1.5 rounded-md bg-cobalt text-[11px] font-black text-white disabled:opacity-50">
                              {savingNote === l.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save note"}
                            </button>
                          )}
                          {/* Brand — overrides the brand auto-detected from the name */}
                          {(() => {
                            const bd = brandDrafts[l.id] ?? l.brand ?? "";
                            const bdirty = bd.trim() !== (l.brand ?? "").trim();
                            return (
                              <div className="mt-1.5">
                                <input type="text" value={bd}
                                  onChange={(e) => setBrandDrafts(d => ({ ...d, [l.id]: e.target.value }))}
                                  placeholder="Brand (e.g. Balmain)"
                                  className="w-full rounded-md border border-black/10 bg-panel px-2 py-1.5 text-[11px] font-bold text-ink/80 outline-none focus:border-cobalt placeholder:font-bold placeholder:text-ink/30" />
                                {bdirty && (
                                  <button type="button" onClick={() => void saveLookBrand(l.id)} disabled={savingBrand === l.id}
                                    className="mt-1 flex h-7 w-full items-center justify-center gap-1.5 rounded-md bg-cobalt text-[11px] font-black text-white disabled:opacity-50">
                                    {savingBrand === l.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save brand"}
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                          {/* Editorial category — editable from the studio (Boudoir = private). */}
                          <div className="mt-1.5 flex items-center justify-between gap-1.5 rounded-md bg-panel px-2 py-1.5">
                            <span className="text-[11px] font-black text-ink/60">Kategorie</span>
                            <select value={(l.category as LookCategory) || categorizeLook({ name: l.name, productNote: l.description })}
                              onChange={(e) => void setMyLookCategory(l.id, e.target.value as LookCategory)}
                              className="rounded-full border border-black/15 bg-white px-2 py-0.5 text-[11px] font-black text-ink outline-none focus:border-cobalt">
                              {LOOK_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.slug === "boudoir" ? "🔒 " : ""}{c.label}</option>)}
                            </select>
                          </div>
                          {/* ── Klamotten: source image + search + tick which dupes show ── */}
                          <div className="mt-3 rounded-lg border border-black/10 p-2.5">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-black uppercase tracking-wide text-ink/45">Klamotten · ähnliche Looks</p>
                              {clothesCands.length > 0 && <button type="button" onClick={() => { setClothesCands([]); setClothesSel(new Set()); }} className="text-[10px] font-black text-coral">Liste leeren</button>}
                            </div>
                            <div className="mt-1.5 flex items-center gap-2">
                              {(editClothesFile || l.clothesImageUrl) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={editClothesFile ? URL.createObjectURL(editClothesFile) : l.clothesImageUrl} alt="" className="h-12 w-12 rounded-md object-cover" />
                              ) : <div className="grid h-12 w-12 place-items-center rounded-md bg-black/5 text-[9px] font-bold text-ink/30">kein Bild</div>}
                              <label className="cursor-pointer rounded-md border border-black/15 px-2 py-1 text-[11px] font-black text-ink/60 hover:border-cobalt">
                                Bild ändern
                                <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) setEditClothesFile(f); }} />
                              </label>
                              <button type="button" onClick={() => void runClothesSearch(l)} disabled={clothesSearching}
                                className="ml-auto rounded-md bg-cobalt px-2.5 py-1 text-[11px] font-black text-white disabled:opacity-50">
                                {clothesSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : "Suchen"}
                              </button>
                            </div>
                            {clothesCands.length > 0 && (
                              <div className="mt-2 flex flex-col gap-1.5">
                                {clothesCands.map((c) => candRow(c, clothesSel.has(c.link), () => toggleIn(setClothesSel, c.link), l.clicks?.[c.link]))}
                              </div>
                            )}
                          </div>
                          {/* ── Location: keyword/image + search + tick which places show ── */}
                          <div className="mt-2 rounded-lg border border-black/10 p-2.5">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-black uppercase tracking-wide text-ink/45">Location · ähnliche Orte</p>
                              {locCands.length > 0 && <button type="button" onClick={() => { setLocCands([]); setLocSel(new Set()); }} className="text-[10px] font-black text-coral">Liste leeren</button>}
                            </div>
                            <div className="mt-1.5 flex items-center gap-2">
                              {(editLocationFile || l.locationImageUrl) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={editLocationFile ? URL.createObjectURL(editLocationFile) : l.locationImageUrl} alt="" className="h-12 w-12 rounded-md object-cover" />
                              ) : <div className="grid h-12 w-12 place-items-center rounded-md bg-black/5 text-[9px] font-bold text-ink/30">kein Bild</div>}
                              <label className="cursor-pointer rounded-md border border-black/15 px-2 py-1 text-[11px] font-black text-ink/60 hover:border-cobalt">
                                Bild ändern
                                <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) setEditLocationFile(f); }} />
                              </label>
                              <button type="button" onClick={() => void runLocationSearch(l)} disabled={locSearching}
                                className="ml-auto rounded-md bg-cobalt px-2.5 py-1 text-[11px] font-black text-white disabled:opacity-50">
                                {locSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : "Suchen"}
                              </button>
                            </div>
                            <PlaceSearchInput value={editLocationQuery} onChange={setEditLocationQuery}
                              wrapperClassName="mt-1.5"
                              placeholder="z. B. „Greece, Thailand“ — mehrere mit Komma"
                              className="h-8 w-full rounded-md border border-black/10 bg-panel px-2 text-[11px] font-semibold text-ink outline-none focus:border-cobalt" />
                            <p className="mt-1 text-[10px] font-bold text-ink/35"><code>Greece, Thailand</code> = beide (ersetzt). <code>+Thailand, +Greece</code> = zur Liste <b>dazu</b>. Max. 5.</p>
                            {locCands.length > 0 && (
                              <div className="mt-2 flex flex-col gap-1.5">
                                {locCands.map((c) => candRow(c, locSel.has(c.link), () => toggleIn(setLocSel, c.link), l.clicks?.[c.link]))}
                              </div>
                            )}
                          </div>
                          <button type="button" onClick={() => void saveEditLists(l.id)} disabled={editSaving === l.id}
                            className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 text-[12px] font-black text-white disabled:opacity-50">
                            {editSaving === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : `Auswahl speichern (${clothesSel.size} Looks · ${locSel.size} Orte)`}
                          </button>
                          {/* Comments on/off for this look */}
                          <button type="button" onClick={() => void toggleLookComments(l.id, !l.commentsOff)}
                            className="mt-1.5 flex w-full items-center justify-between rounded-md bg-panel px-2 py-1.5 text-[11px] font-black text-ink/60">
                            <span>Comments</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] ${l.commentsOff ? "bg-black/10 text-ink/50" : "bg-emerald-100 text-emerald-700"}`}>{l.commentsOff ? "Off" : "On"}</span>
                          </button>
                          {/* Video — own upload (e.g. Pixverse reel) or AI-generated (Pixverse). */}
                          {l.videoUrl ? (
                            <div className="mt-1.5 flex items-center justify-between gap-2 rounded-md bg-emerald-50 px-2 py-1.5 text-[11px] font-black text-emerald-700">
                              <span className="flex items-center gap-1"><Video className="h-3.5 w-3.5" /> Video ready</span>
                              <span className="flex items-center gap-2.5">
                                <label className={`cursor-pointer text-cobalt ${uploadingVideo === l.id ? "opacity-50" : ""}`}>
                                  {uploadingVideo === l.id ? "Lädt…" : "Ersetzen"}
                                  <input type="file" accept="video/*" className="sr-only" disabled={uploadingVideo === l.id}
                                    onChange={e => { const f = e.target.files?.[0]; if (f) void replaceLookVideo(l.id, f); e.target.value = ""; }} />
                                </label>
                                <button type="button" onClick={() => void removeLookVideo(l.id)} disabled={uploadingVideo === l.id} className="text-red-500 disabled:opacity-50">Remove</button>
                              </span>
                            </div>
                          ) : (
                            <div className="mt-1.5 flex flex-col gap-1.5">
                              <label className={`flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-black/15 bg-panel px-2 py-1.5 text-[11px] font-black text-ink/55 hover:border-cobalt ${uploadingVideo === l.id ? "opacity-60" : ""}`}>
                                {uploadingVideo === l.id ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Lädt…</> : <><Video className="h-3.5 w-3.5" /> Eigenes Video hochladen (z. B. Pixverse)</>}
                                <input type="file" accept="video/*" className="sr-only" disabled={uploadingVideo === l.id}
                                  onChange={e => { const f = e.target.files?.[0]; if (f) void replaceLookVideo(l.id, f); e.target.value = ""; }} />
                              </label>
                              <button type="button" onClick={() => void generateLookVideo(l.id)} disabled={uploadingVideo === l.id}
                                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-black/15 bg-panel px-2 py-1.5 text-[11px] font-black text-ink/55 hover:border-cobalt disabled:opacity-60">
                                {uploadingVideo === l.id ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating video…</> : <><Video className="h-3.5 w-3.5" /> Generate AI video · 5s · {costs?.video ?? 8} credits</>}
                              </button>
                            </div>
                          )}
                          </div>
                          {editErr && <p className="mt-2 rounded-md bg-red-50 px-2 py-1.5 text-[11px] font-black text-red-600">{editErr}</p>}
                          <div className="border-t border-black/10 p-3">
                            <button type="button" disabled={editSaving === l.id}
                              onClick={async () => { const ok = await saveEditLists(l.id); if (ok) setEditingLookId(null); }}
                              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white active:scale-[0.99] disabled:opacity-60">
                              {editSaving === l.id ? <><Loader2 className="h-4 w-4 animate-spin" /> Speichern…</> : "Speichern & fertig"}</button>
                          </div>
                        </div>
                      </div>
                      );
                    })()}
                </div>
                );
              })}
            </div>
          </section>
        )}

        {publishResult && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-black text-green-700">
            <Check className="h-4 w-4" /> {publishResult}
            <a href="/stores" target="_blank" rel="noopener noreferrer" className="ml-auto text-xs underline">View</a>
          </div>
        )}
      </div>

      {/* Publish selection bar — floats just above the bottom nav */}
      {drafts.length > 0 && (
        <div className="fixed inset-x-0 z-30 border-t border-black/10 bg-white/95 px-4 py-3 backdrop-blur"
          style={{ bottom: "calc(56px + env(safe-area-inset-bottom))" }}>
          <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
            <span className="text-sm font-black text-ink">{drafts.length} selected</span>
            <button type="button" onClick={() => { setDrafts([]); setUsedLinks([]); }} disabled={publishing}
              className="text-xs font-black text-ink/45 underline disabled:opacity-40">Clear</button>
            <button type="button" onClick={() => setModelPickerOpen(true)} disabled={publishing}
              className="ml-auto inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-black px-6 text-sm font-black text-white disabled:opacity-50 active:scale-95 transition-transform">
              {publishing
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Publishing… {publishProgress.done}/{publishProgress.total}</>
                : <>Publish selection ({drafts.length})</>}
            </button>
          </div>
        </div>
      )}

      {/* Choose-a-model sheet — opens on "Publish selection". The chosen photo is
          dressed in each selected piece (server-side try-on) and published. */}
      {modelPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModelPickerOpen(false); }}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-black text-ink">Choose a model</p>
                <p className="mt-0.5 text-xs font-bold text-ink/45">
                  We&apos;ll put {drafts.length === 1 ? "this piece" : `these ${drafts.length} pieces`} on the model you pick, then publish.
                </p>
              </div>
              <button type="button" onClick={() => setModelPickerOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10 text-ink"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
              {curatorPhotoUrl && (
                <button type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch(curatorPhotoUrl);
                      const dataUrl = await blobToDataUrl(await res.blob());
                      void publishSelection(dataUrl);
                    } catch { void publishSelection(); }
                  }}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-black text-sm font-black text-white transition active:bg-black/90">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={curatorPhotoUrl} alt="Profile" className="h-7 w-7 rounded-full object-cover" />
                  Use my profile photo
                </button>
              )}

              <label className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/15 text-sm font-black text-ink/60 transition hover:border-black/30 hover:bg-black/[0.03]">
                <ImagePlus className="h-4 w-4" /> Upload a model photo
                <input type="file" accept="image/*" className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    try { void publishSelection(await blobToDataUrl(f)); } catch { void publishSelection(); }
                  }} />
              </label>

              <button type="button" onClick={() => void publishSelection()}
                className="h-11 w-full rounded-xl text-xs font-black text-ink/45 underline">
                Publish product photo only (no model)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credits — rules + earn vs buy */}
      {showBuyCredits && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowBuyCredits(false); }}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-black text-ink">🪙 {credits?.credits ?? 0} credits</p>
                <p className="mt-0.5 text-xs font-bold text-ink/45">This is your chance to prove yourself.</p>
              </div>
              <button type="button" onClick={() => setShowBuyCredits(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10 text-ink"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-4 grid gap-2.5 text-sm font-semibold leading-relaxed text-ink/70">
              <p>Using the studio costs credits — <span className="font-black text-ink">try-on {costs?.tryon ?? 2}</span>, <span className="font-black text-ink">web search {costs?.search ?? 1}</span>, <span className="font-black text-ink">AI video {costs?.video ?? 8}</span>. You started with <span className="font-black text-ink">{costs?.starter ?? 30}</span> to prove yourself.</p>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
                <p className="text-sm font-black text-emerald-700">Earn more — free</p>
                <p className="mt-1 text-[13px] font-semibold leading-5 text-emerald-700/80">
                  When your looks land, we top you up automatically: get <span className="font-black">likes</span>, <span className="font-black">try-ons</span> and <span className="font-black">followers</span> and you earn more credits. The more your looks get worn &amp; shared, the more you make.
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-3.5">
                <p className="text-sm font-black text-ink">Out of credits &amp; want to keep going?</p>
                <p className="mt-1 text-[13px] font-semibold leading-5 text-ink/55">Buy a credit pack to keep creating while you build your following.</p>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {[30, 100, 300].map(n => (
                    <button key={n} type="button" onClick={() => alert("Credit purchase is coming soon — we'll notify you. For now, earn credits by getting likes & try-ons!")}
                      className="rounded-xl border border-black/12 bg-white p-3 text-center active:scale-95 transition">
                      <span className="block text-base font-black text-ink">{n}</span>
                      <span className="block text-[10px] font-bold text-ink/40">credits</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] font-bold text-ink/35">Buying credits is coming soon.</p>
              </div>
            </div>
            <button type="button" onClick={() => setShowBuyCredits(false)}
              className="mt-4 h-12 w-full rounded-2xl bg-black text-sm font-black text-white active:scale-95 transition">Got it</button>
          </div>
        </div>
      )}
    </main>
  );
}
