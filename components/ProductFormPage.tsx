"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Loader2, X, Sparkles, ImagePlus,
  Scissors, Upload, User, Info, Check,
} from "lucide-react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import GarmentExtractorModal from "@/components/GarmentExtractorModal";
import CropModal from "@/components/CropModal";

/* ── Types ─────────────────────────────────────────────────────────────── */
type Look = {
  id: string; name: string; campaignName?: string; price?: string; salePrice?: string;
  availableSizes?: string[]; productNote?: string; hashtags?: string; inStock?: boolean;
  published?: boolean; imageUrl?: string; galleryImageUrls?: string[];
  galleryImagePaths?: string[]; deliveryTime?: string; availabilityNote?: string;
  dealEndsAt?: string; createdAt: string;
};

const GALLERY_SLOTS = 10;

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, b64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

type GallerySlot = { file: File | null; preview: string | null; existingPath?: string };
type FormState = {
  name: string; campaignName: string; price: string; salePrice: string;
  availableSizes: string; productNote: string; hashtags: string; inStock: boolean;
  deliveryTime: string; availabilityNote: string; dealEndsAt: string;
  gallery: GallerySlot[];
};
const emptyGallery = (): GallerySlot[] =>
  Array.from({ length: GALLERY_SLOTS }, () => ({ file: null, preview: null }));
const emptyForm = (): FormState => ({
  name: "", campaignName: "", price: "", salePrice: "", availableSizes: "",
  productNote: "", hashtags: "", inStock: true,
  deliveryTime: "", availabilityNote: "", dealEndsAt: "",
  gallery: emptyGallery(),
});

/* ── Component ──────────────────────────────────────────────────────────── */
export default function ProductFormPage({ editId }: { editId: string | null }) {
  const router = useRouter();
  const session = typeof window !== "undefined" ? getStoredAuthSession() : null;
  const authHeader = () => ({ Authorization: `Bearer ${session?.access_token ?? ""}` });

  const [form, setForm] = useState<FormState>(emptyForm());
  const [loading, setLoading] = useState(!!editId);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [savingAs, setSavingAs] = useState<"publish" | "draft" | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeSlotRef = useRef<number>(0);
  const extractorFileRef = useRef<HTMLInputElement>(null);
  const luxModelFileRef = useRef<HTMLInputElement>(null);
  const dragSrcRef = useRef<number | null>(null);

  const [extractorSrc, setExtractorSrc] = useState<string | null>(null);
  const [cropSlotIdx, setCropSlotIdx] = useState<number | null>(null);
  const [showExtractInfo, setShowExtractInfo] = useState(false);
  const [showLuxFitInfo, setShowLuxFitInfo] = useState(false);
  const [showLuxFit, setShowLuxFit] = useState(false);
  const [luxGarmentIdx, setLuxGarmentIdx] = useState(0);
  const [luxMode, setLuxMode] = useState<"ai-model" | "my-photo">("ai-model");
  const [luxModelPhoto, setLuxModelPhoto] = useState<string | null>(null);
  const [luxLoading, setLuxLoading] = useState(false);
  const [luxError, setLuxError] = useState<string | null>(null);

  /* ── Load existing product for edit ─────────────────────────────────── */
  useEffect(() => {
    const s = getStoredAuthSession();
    if (!s?.access_token) { router.push("/stores?panel=account"); return; }
    if (!editId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/seller/me", { headers: { Authorization: `Bearer ${s.access_token}` } });
        if (!res.ok) return;
        const d = await res.json() as { looks: Look[] };
        const look = d.looks.find(l => l.id === editId);
        if (!look) { router.push("/user/mystore"); return; }
        const urls = look.galleryImageUrls ?? (look.imageUrl ? [look.imageUrl] : []);
        const paths = look.galleryImagePaths ?? [];
        const gallery: GallerySlot[] = Array.from({ length: GALLERY_SLOTS }, (_, i) => ({
          file: null, preview: urls[i] ?? null, existingPath: paths[i] ?? undefined,
        }));
        setForm({
          name: look.name, campaignName: look.campaignName ?? "",
          price: look.price ?? "", salePrice: look.salePrice ?? "",
          availableSizes: (look.availableSizes ?? []).join(", "),
          productNote: look.productNote ?? "", hashtags: look.hashtags ?? "",
          inStock: look.inStock !== false, deliveryTime: look.deliveryTime ?? "",
          availabilityNote: look.availabilityNote ?? "",
          dealEndsAt: look.dealEndsAt ? String(look.dealEndsAt).slice(0, 16) : "",
          gallery,
        });
      } finally { setLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  /* ── AI description ──────────────────────────────────────────────────── */
  const runAiDescription = async (file: File) => {
    setAiLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/generate-product-description", { method: "POST", body: fd });
      if (!res.ok) return;
      const d = await res.json() as { title?: string; description?: string; hashtags?: string };
      setForm(f => ({
        ...f,
        name: f.name || (d.title ?? ""),
        productNote: f.productNote || (d.description ?? ""),
        hashtags: f.hashtags || (d.hashtags ?? ""),
      }));
    } catch { /**/ }
    finally { setAiLoading(false); }
  };

  /* ── Gallery ─────────────────────────────────────────────────────────── */
  const openSlot = (index: number) => { activeSlotRef.current = index; fileInputRef.current?.click(); };

  const handleGalleryFileChange = (file: File | null) => {
    if (!file) return;
    const idx = activeSlotRef.current;
    const reader = new FileReader();
    reader.onload = e => {
      const preview = e.target?.result as string;
      setForm(f => ({ ...f, gallery: f.gallery.map((s, i) => i === idx ? { ...s, file, preview } : s) }));
      if (idx === 0) void runAiDescription(file);
    };
    reader.readAsDataURL(file);
  };

  const removeSlot = (index: number) => {
    setForm(f => ({ ...f, gallery: f.gallery.map((s, i) => i === index ? { file: null, preview: null, existingPath: undefined } : s) }));
  };

  const addFilesToGallery = (files: FileList | File[]) => {
    const arr = Array.from(files);
    setForm(f => {
      const gallery = [...f.gallery];
      let fi = 0;
      for (let i = 0; i < gallery.length && fi < arr.length; i++) {
        if (!gallery[i].preview) {
          const file = arr[fi++];
          gallery[i] = { file, preview: URL.createObjectURL(file) };
          if (i === 0) void runAiDescription(file);
        }
      }
      return { ...f, gallery };
    });
  };

  const handleDragStart = (i: number) => { dragSrcRef.current = i; };
  const handleDrop = (i: number) => {
    const src = dragSrcRef.current;
    if (src === null || src === i) return;
    setForm(f => {
      const gallery = [...f.gallery];
      [gallery[src], gallery[i]] = [gallery[i], gallery[src]];
      return { ...f, gallery };
    });
    dragSrcRef.current = null;
  };

  /* ── Extractor ───────────────────────────────────────────────────────── */
  const handleExtractorFileChange = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setExtractorSrc(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleExtractorConfirm = (crops: string[]) => {
    setExtractorSrc(null);
    if (!crops.length) return;
    setForm(f => {
      const gallery = [...f.gallery];
      let ci = 0;
      for (let i = 0; i < gallery.length && ci < crops.length; i++) {
        if (!gallery[i].preview) {
          const dataUrl = crops[ci++];
          gallery[i] = { file: dataUrlToFile(dataUrl, `extracted-${i}.png`), preview: dataUrl };
        }
      }
      return { ...f, gallery };
    });
  };

  /* ── LuxbanditFit ────────────────────────────────────────────────────── */
  const inferCategory = () => {
    const t = [form.name, form.productNote, form.hashtags].join(" ").toLowerCase();
    if (/dress|jumpsuit|bodysuit|overall|one.piece/.test(t)) return "one-pieces";
    if (/skirt|pants|shorts|jeans|leggings|hose/.test(t)) return "bottoms";
    if (/lingerie|bra|underwear|string/.test(t)) return "lingerie";
    return "tops";
  };

  const handleLuxbanditGenerate = async () => {
    const slot = form.gallery[luxGarmentIdx];
    if (!slot.preview) { setLuxError("No product image in this slot."); return; }
    if (luxMode === "my-photo" && !luxModelPhoto) { setLuxError("Please upload your photo first."); return; }
    setLuxLoading(true); setLuxError(null);
    try {
      const fd = new FormData();
      if (slot.file) { fd.append("image", slot.file); }
      else { const r = await fetch(slot.preview); fd.append("image", await r.blob(), "garment.jpg"); }
      if (luxMode === "my-photo" && luxModelPhoto) fd.append("modelImage", dataUrlToFile(luxModelPhoto, "model.jpg"));
      fd.append("visitorId", session?.user?.id ?? "user");
      fd.append("lookId", editId ?? "draft");
      fd.append("mode", "fashion-model");
      fd.append("provider", luxMode === "my-photo" ? "fashn" : "openai");
      fd.append("category", inferCategory());
      fd.append("viewDirection", "front");
      fd.append("modelGender", "woman");
      fd.append("skinTone", "white");
      fd.append("aspectRatio", "4:5");
      fd.append("prompt", luxMode === "my-photo"
        ? `Show the exact garment on the person in the model photo. Listing: ${form.name}.`
        : `Professional female fashion model wearing the EXACT garment. Clean studio background. Listing: ${form.name}.`
      );
      const res = await fetch("/api/try-this-look-openai", {
        method: "POST", body: fd,
        headers: { "x-shopcut-account-id": session?.user?.id ?? "user" },
      });
      const payload = await res.json() as { image?: string; error?: string };
      if (!res.ok || !payload.image) { setLuxError(payload.error ?? "Generation failed."); return; }
      const resultFile = dataUrlToFile(payload.image, "luxbanditfit.png");
      setForm(f => {
        const gallery = [...f.gallery];
        const empty = gallery.findIndex(s => !s.preview);
        if (empty >= 0) gallery[empty] = { file: resultFile, preview: payload.image! };
        return { ...f, gallery };
      });
      setShowLuxFit(false);
    } catch (e) { setLuxError(e instanceof Error ? e.message : "Network error."); }
    finally { setLuxLoading(false); }
  };

  /* ── Save ────────────────────────────────────────────────────────────── */
  const handleSave = async (publish: boolean) => {
    if (!form.name.trim()) { setError("Product name is required."); return; }
    setSavingAs(publish ? "publish" : "draft"); setError("");
    try {
      const fd = new FormData();
      fd.append("action", editId ? "update-look" : "upload-look");
      if (editId) fd.append("id", editId);
      fd.append("name", form.name);
      fd.append("price", form.price);
      fd.append("productNote", form.productNote);
      fd.append("hashtags", form.hashtags);
      fd.append("inStock", String(form.inStock));
      fd.append("published", String(publish));
      if (form.salePrice) fd.append("salePrice", form.salePrice);
      if (form.availableSizes.trim()) fd.append("availableSizes", form.availableSizes);
      if (form.campaignName.trim()) fd.append("campaignName", form.campaignName);
      if (form.deliveryTime.trim()) fd.append("deliveryTime", form.deliveryTime);
      if (form.availabilityNote.trim()) fd.append("availabilityNote", form.availabilityNote);
      if (form.dealEndsAt.trim()) fd.append("dealEndsAt", form.dealEndsAt);
      const existingPaths = form.gallery.map(s => (!s.file && s.existingPath) ? s.existingPath : null);
      fd.append("galleryExistingPaths", JSON.stringify(existingPaths));
      form.gallery.forEach((slot, i) => { if (slot.file) fd.append(`galleryFile${i}`, slot.file); });
      const res = await fetch("/api/seller/action", { method: "POST", headers: authHeader(), body: fd });
      const payload = await res.json() as { error?: string };
      if (!res.ok) { setError(payload.error ?? "Error saving."); return; }
      router.push("/user/mystore");
    } catch { setError("Network error."); }
    finally { setSavingAs(null); }
  };

  /* ── Loading state ───────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-black/30" />
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#fafaf8]" style={{ paddingBottom: "max(6rem, env(safe-area-inset-bottom))" }}>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-black/8 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <button type="button" onClick={() => router.back()}
            className="grid h-9 w-9 place-items-center rounded-full border border-black/10 text-black/50 active:bg-black/5">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-black text-black">{editId ? "Edit Product" : "New Product"}</span>
          <div className="w-9" />
        </div>
      </header>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => {
          const files = e.target.files;
          if (!files?.length) return;
          if (files.length === 1) handleGalleryFileChange(files[0]);
          else addFilesToGallery(files);
          e.target.value = "";
        }} />
      <input ref={extractorFileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { handleExtractorFileChange(e.target.files?.[0] ?? null); e.target.value = ""; }} />
      <input ref={luxModelFileRef} type="file" accept="image/*" className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]; if (!f) return;
          const reader = new FileReader();
          reader.onload = ev => setLuxModelPhoto(ev.target?.result as string);
          reader.readAsDataURL(f); e.target.value = "";
        }} />

      <div className="mx-auto max-w-lg px-4 pt-5 grid gap-4">

        {/* ── Gallery ── */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-wider text-black/40">
              Product Gallery
              <span className="ml-1.5 font-bold text-black/25 normal-case tracking-normal">
                ({form.gallery.filter(s => s.preview).length}/10)
              </span>
            </p>
            <p className="text-[10px] font-bold text-black/30">First image = main image</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {form.gallery.map((slot, i) => (
              <div key={i} className="relative"
                draggable={Boolean(slot.preview)}
                onDragStart={() => handleDragStart(i)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(i)}
              >
                {slot.preview ? (
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden border-2 border-black/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={slot.preview} alt={`Photo ${i + 1}`} className="absolute inset-0 h-full w-full object-cover" />
                    <button type="button" onClick={() => openSlot(i)} className="absolute inset-0 w-full h-full" aria-label="Replace photo" />
                    <button type="button"
                      onClick={e => { e.stopPropagation(); setCropSlotIdx(i); }}
                      className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1.5 bg-black/55 py-3 active:bg-black/75 transition-colors">
                      <Scissors className="h-5 w-5 text-white" />
                      <span className="text-sm font-black text-white">Crop</span>
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => openSlot(i)}
                    className="relative w-full aspect-square rounded-xl border-2 border-dashed border-black/15 bg-black/[0.02] flex items-center justify-center active:bg-black/5 transition-colors">
                    <div className="flex flex-col items-center gap-1">
                      <ImagePlus className="h-6 w-6 text-black/20" />
                      <span className="text-[10px] font-black text-black/20">{i + 1}</span>
                    </div>
                  </button>
                )}
                {slot.preview && (
                  <button type="button" onClick={() => removeSlot(i)}
                    className="absolute -top-1.5 -right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black text-white shadow-md">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}

            {/* Upload & Extract tile */}
            <div className="relative aspect-square">
              <button type="button" onClick={() => extractorFileRef.current?.click()}
                className="w-full h-full rounded-xl border-2 border-dashed border-amber-400/60 bg-amber-50 flex flex-col items-center justify-center gap-1 p-2 text-amber-700 active:bg-amber-100 transition-colors">
                <Scissors className="h-6 w-6" />
                <span className="text-[11px] font-black uppercase leading-tight text-center">Upload &amp; Extract</span>
                <span className="text-[10px] font-bold text-amber-600/70 leading-tight">Clothes</span>
              </button>
              <button type="button"
                onClick={e => { e.stopPropagation(); setShowExtractInfo(v => !v); setShowLuxFitInfo(false); }}
                className="absolute -top-2 -right-2 h-7 w-7 flex items-center justify-center rounded-full bg-amber-400 text-white shadow-md active:bg-amber-500 transition-colors z-10">
                <Info className="h-4 w-4" />
              </button>
            </div>

            {/* LuxbanditFit tile */}
            <div className="relative aspect-square">
              {editId ? (
                <button type="button"
                  onClick={() => { setLuxGarmentIdx(form.gallery.findIndex(s => s.preview) >= 0 ? form.gallery.findIndex(s => s.preview) : 0); setShowLuxFit(true); }}
                  className="w-full h-full rounded-xl border-2 border-dashed border-violet-400/50 bg-violet-50 flex flex-col items-center justify-center gap-1 p-2 text-violet-700 active:bg-violet-100 transition-colors">
                  <Sparkles className="h-6 w-6" />
                  <span className="text-[11px] font-black uppercase leading-tight text-center">LuxbanditFit</span>
                  <span className="text-[10px] font-bold text-violet-500/70 leading-tight">AI Photo</span>
                </button>
              ) : (
                <div className="w-full h-full rounded-xl border-2 border-dashed border-violet-300/40 bg-violet-50/50 flex flex-col items-center justify-center gap-1 p-2 text-violet-300">
                  <Sparkles className="h-6 w-6" />
                  <span className="text-[11px] font-black uppercase leading-tight text-center">LuxbanditFit</span>
                  <span className="text-[10px] font-bold leading-tight">Save first</span>
                </div>
              )}
              <button type="button"
                onClick={e => { e.stopPropagation(); setShowLuxFitInfo(v => !v); setShowExtractInfo(false); }}
                className="absolute -top-2 -right-2 h-7 w-7 flex items-center justify-center rounded-full bg-violet-500 text-white shadow-md active:bg-violet-600 transition-colors z-10">
                <Info className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Upload & Extract info panel */}
        {showExtractInfo && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200/60 px-4 py-3 grid gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <p className="text-xs font-black text-amber-800">Upload &amp; Extract Clothes</p>
              </div>
              <button type="button" onClick={() => setShowExtractInfo(false)} className="grid h-5 w-5 place-items-center rounded-full bg-amber-200/60 text-amber-700">
                <X className="h-3 w-3" />
              </button>
            </div>
            <p className="text-xs font-bold text-amber-700/80 leading-relaxed">Upload any photo of clothing being worn — AI automatically detects each garment and isolates it from the background.</p>
            <div className="grid gap-1 mt-0.5">
              <div className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">📸</span><p className="text-[11px] font-bold text-amber-700/70 leading-relaxed">Upload a photo with one or more garments on a person or mannequin.</p></div>
              <div className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">✂️</span><p className="text-[11px] font-bold text-amber-700/70 leading-relaxed">AI detects and crops each item — select which pieces you want to keep.</p></div>
              <div className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">🖼️</span><p className="text-[11px] font-bold text-amber-700/70 leading-relaxed">The clean garment cutouts land directly in your product gallery.</p></div>
            </div>
            <button type="button" onClick={() => { setShowExtractInfo(false); extractorFileRef.current?.click(); }}
              className="mt-1 flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-xs font-black text-white active:opacity-80">
              <Scissors className="h-3.5 w-3.5" /> Open Upload &amp; Extract
            </button>
          </div>
        )}

        {/* LuxbanditFit info panel */}
        {showLuxFitInfo && (
          <div className="rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3 grid gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                <p className="text-xs font-black text-violet-800">LuxbanditFit ✨</p>
              </div>
              <button type="button" onClick={() => setShowLuxFitInfo(false)} className="grid h-5 w-5 place-items-center rounded-full bg-violet-200/60 text-violet-700">
                <X className="h-3 w-3" />
              </button>
            </div>
            <p className="text-xs font-bold text-violet-700/80 leading-relaxed">Show your product on a model — AI generates the photo automatically, no photoshoot needed.</p>
            <div className="grid gap-1 mt-0.5">
              <div className="flex items-start gap-2"><span className="text-violet-500 mt-0.5">✨</span><p className="text-[11px] font-bold text-violet-700/70 leading-relaxed"><strong className="font-black">AI Model:</strong> An AI-generated fashion model wears your garment. Perfect for professional product photos without a photoshoot.</p></div>
              <div className="flex items-start gap-2"><span className="text-violet-500 mt-0.5">🪞</span><p className="text-[11px] font-bold text-violet-700/70 leading-relaxed"><strong className="font-black">My Photo:</strong> Upload your own photo — the garment is virtually tried on you (powered by FASHN AI).</p></div>
            </div>
            {editId ? (
              <button type="button" onClick={() => { setShowLuxFitInfo(false); setLuxGarmentIdx(form.gallery.findIndex(s => s.preview) >= 0 ? form.gallery.findIndex(s => s.preview) : 0); setShowLuxFit(true); }}
                className="mt-1 flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-xs font-black text-white active:opacity-80">
                <Sparkles className="h-3.5 w-3.5" /> Open LuxbanditFit
              </button>
            ) : (
              <p className="text-[10px] font-bold text-violet-400/80 mt-0.5">Save your product first to unlock LuxbanditFit.</p>
            )}
          </div>
        )}

        {/* AI generate button */}
        {aiLoading ? (
          <div className="flex items-center gap-2 rounded-xl bg-violet-50 px-4 py-3">
            <Sparkles className="h-4 w-4 text-violet-500 animate-pulse" />
            <p className="text-xs font-black text-violet-700">AI is analyzing your product…</p>
          </div>
        ) : form.gallery[0]?.preview ? (
          <button type="button"
            onClick={() => { const f = form.gallery[0].file; if (f) void runAiDescription(f); }}
            disabled={!form.gallery[0].file}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 text-xs font-black text-violet-700 disabled:opacity-40 active:bg-violet-100 transition-colors">
            <Sparkles className="h-3.5 w-3.5" /> Generate AI title, description &amp; hashtags
          </button>
        ) : null}

        {/* Product Name */}
        <div>
          <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">Product Name *</label>
          <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Oversized Vintage Hoodie"
            className="h-12 w-full rounded-2xl border border-black/10 bg-black/[0.02] px-4 text-sm font-bold text-black placeholder:text-black/25 outline-none focus:border-black" />
        </div>

        {/* Campaign Name */}
        <div>
          <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">Campaign Name</label>
          <input type="text" value={form.campaignName} onChange={e => setForm(f => ({ ...f, campaignName: e.target.value }))}
            placeholder="e.g. Summer Drop 2026"
            className="h-12 w-full rounded-2xl border border-black/10 bg-black/[0.02] px-4 text-sm font-bold text-black placeholder:text-black/25 outline-none focus:border-black" />
        </div>

        {/* Price + Sale Price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">Price (€)</label>
            <div className="flex items-center gap-2 h-12 rounded-2xl border border-black/10 bg-black/[0.02] px-4 focus-within:border-black">
              <span className="text-sm font-black text-black/30">€</span>
              <input type="number" inputMode="decimal" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="0.00" className="flex-1 bg-transparent text-sm font-bold text-black placeholder:text-black/25 outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">Sale Price (€)</label>
            <div className="flex items-center gap-2 h-12 rounded-2xl border border-black/10 bg-black/[0.02] px-4 focus-within:border-black">
              <span className="text-sm font-black text-emerald-500">€</span>
              <input type="number" inputMode="decimal" value={form.salePrice} onChange={e => setForm(f => ({ ...f, salePrice: e.target.value }))}
                placeholder="0.00" className="flex-1 bg-transparent text-sm font-bold text-black placeholder:text-black/25 outline-none" />
            </div>
          </div>
        </div>

        {/* Available Sizes */}
        <div>
          <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">Available Sizes</label>
          <input type="text" value={form.availableSizes} onChange={e => setForm(f => ({ ...f, availableSizes: e.target.value }))}
            placeholder="XS, S, M, L, XL"
            className="h-12 w-full rounded-2xl border border-black/10 bg-black/[0.02] px-4 text-sm font-bold text-black placeholder:text-black/25 outline-none focus:border-black" />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">Description</label>
          <textarea value={form.productNote} onChange={e => setForm(f => ({ ...f, productNote: e.target.value }))}
            placeholder="Short product description…" rows={3}
            className="w-full rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm font-bold text-black placeholder:text-black/25 outline-none focus:border-black resize-none" />
        </div>

        {/* Hashtags */}
        <div>
          <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">Hashtags</label>
          <input type="text" value={form.hashtags} onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))}
            placeholder="#fashion #vintage #streetwear"
            className="h-12 w-full rounded-2xl border border-black/10 bg-black/[0.02] px-4 text-sm font-bold text-black placeholder:text-black/25 outline-none focus:border-black" />
        </div>

        {/* Delivery + Availability */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">Delivery Time (days)</label>
            <input type="number" inputMode="numeric" value={form.deliveryTime} onChange={e => setForm(f => ({ ...f, deliveryTime: e.target.value }))}
              placeholder="3" className="h-12 w-full rounded-2xl border border-black/10 bg-black/[0.02] px-4 text-sm font-bold text-black placeholder:text-black/25 outline-none focus:border-black" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">Available in (days)</label>
            <input type="number" inputMode="numeric" value={form.availabilityNote} onChange={e => setForm(f => ({ ...f, availabilityNote: e.target.value }))}
              placeholder="7" className="h-12 w-full rounded-2xl border border-black/10 bg-black/[0.02] px-4 text-sm font-bold text-black placeholder:text-black/25 outline-none focus:border-black" />
          </div>
        </div>

        {/* Deal Ends At */}
        <div>
          <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">Deal Ends At</label>
          <input type="datetime-local" value={form.dealEndsAt} onChange={e => setForm(f => ({ ...f, dealEndsAt: e.target.value }))}
            className="h-12 w-full rounded-2xl border border-black/10 bg-black/[0.02] px-4 text-sm font-bold text-black outline-none focus:border-black" />
        </div>

        {/* In Stock */}
        <button type="button" onClick={() => setForm(f => ({ ...f, inStock: !f.inStock }))}
          className="flex items-center justify-between rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3">
          <span className="text-sm font-black text-black">In Stock</span>
          <div className={`relative h-6 w-11 rounded-full transition-colors ${form.inStock ? "bg-black" : "bg-black/15"}`}>
            <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.inStock ? "translate-x-5" : "translate-x-0.5"}`} />
          </div>
        </button>

        {/* Error */}
        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">{error}</p>}

        {/* Save buttons */}
        <div className="grid gap-2 pb-4">
          <button type="button" onClick={() => void handleSave(true)}
            disabled={!!savingAs || aiLoading || !form.name.trim()}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#f4725a] text-base font-black text-white disabled:opacity-40 active:scale-95 transition-transform">
            {savingAs === "publish" ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Sparkles className="h-5 w-5" /> Save and publish</>}
          </button>
          <button type="button" onClick={() => void handleSave(false)}
            disabled={!!savingAs || aiLoading || !form.name.trim()}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-black/12 bg-black/[0.02] text-base font-black text-black disabled:opacity-40 active:scale-95 transition-transform">
            {savingAs === "draft" ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-5 w-5" /> Save as draft</>}
          </button>
        </div>
      </div>

      {/* ── Modals ── */}
      {extractorSrc && (
        <GarmentExtractorModal imageSrc={extractorSrc} onConfirm={handleExtractorConfirm} onCancel={() => setExtractorSrc(null)} />
      )}
      {cropSlotIdx !== null && form.gallery[cropSlotIdx]?.preview && (
        <CropModal
          imageSrc={form.gallery[cropSlotIdx].preview!}
          onConfirm={(croppedDataUrl) => {
            const idx = cropSlotIdx;
            setCropSlotIdx(null);
            const file = dataUrlToFile(croppedDataUrl, `cropped-${idx}.jpg`);
            setForm(f => ({ ...f, gallery: f.gallery.map((s, i) => i === idx ? { ...s, file, preview: croppedDataUrl } : s) }));
          }}
          onCancel={() => setCropSlotIdx(null)}
        />
      )}

      {/* LuxbanditFit Modal */}
      {showLuxFit && (
        <>
          <div className="fixed inset-0 z-[201] bg-black/50 backdrop-blur-sm" onClick={() => !luxLoading && setShowLuxFit(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[202] rounded-t-3xl bg-white shadow-2xl overflow-y-auto overscroll-contain"
            style={{ maxHeight: "80dvh", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
            <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-10 rounded-full bg-black/15" /></div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/5">
              <div>
                <p className="text-base font-black text-black">LuxbanditFit ✨</p>
                <p className="text-xs font-bold text-black/40">AI fashion photo of your product</p>
              </div>
              <button type="button" onClick={() => setShowLuxFit(false)} className="grid h-8 w-8 place-items-center rounded-full bg-black/5">
                <X className="h-4 w-4 text-black/50" />
              </button>
            </div>
            <div className="grid gap-4 px-5 py-4">
              {/* Select image */}
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-black/40">Select product image</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {form.gallery.filter(s => s.preview).map((slot, idx) => {
                    const realIdx = form.gallery.indexOf(slot);
                    return (
                      <button key={idx} type="button" onClick={() => setLuxGarmentIdx(realIdx)}
                        className={`relative h-16 w-16 shrink-0 rounded-xl overflow-hidden border-2 transition-colors ${luxGarmentIdx === realIdx ? "border-violet-500" : "border-black/10"}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={slot.preview!} alt="" className="h-full w-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Mode */}
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-black/40">Mode</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setLuxMode("ai-model")}
                    className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-colors ${luxMode === "ai-model" ? "border-violet-500 bg-violet-50 text-violet-700" : "border-black/10 text-black/50"}`}>
                    <Sparkles className="h-4 w-4" /> AI Model
                  </button>
                  <button type="button" onClick={() => setLuxMode("my-photo")}
                    className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-colors ${luxMode === "my-photo" ? "border-violet-500 bg-violet-50 text-violet-700" : "border-black/10 text-black/50"}`}>
                    <User className="h-4 w-4" /> My Photo
                  </button>
                </div>
              </div>
              {/* My photo upload */}
              {luxMode === "my-photo" && (
                <div>
                  <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-black/40">Your Photo</p>
                  {luxModelPhoto ? (
                    <div className="relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={luxModelPhoto} alt="Model" className="h-28 w-28 rounded-2xl object-cover" />
                      <button type="button" onClick={() => setLuxModelPhoto(null)} className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => luxModelFileRef.current?.click()}
                      className="flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-black/15 bg-black/[0.02] text-black/40 active:bg-black/5">
                      <Upload className="h-5 w-5" />
                      <span className="text-[10px] font-black">Upload Photo</span>
                    </button>
                  )}
                </div>
              )}
              {luxError && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">{luxError}</p>}
              <button type="button" onClick={() => void handleLuxbanditGenerate()}
                disabled={luxLoading || !form.gallery[luxGarmentIdx]?.preview || (luxMode === "my-photo" && !luxModelPhoto)}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-violet-600 text-base font-black text-white disabled:opacity-30 active:scale-95 transition-transform">
                {luxLoading ? <><Loader2 className="h-5 w-5 animate-spin" /> Generating…</> : <><Sparkles className="h-5 w-5" /> Generate LuxbanditFit</>}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
