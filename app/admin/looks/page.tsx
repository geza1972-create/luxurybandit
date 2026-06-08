"use client";

import { Check, ImagePlus, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";

type Look = {
  id: string;
  name: string;
  campaignName?: string;
  storeName?: string;
  storeSlug?: string;
  storeAddress?: string;
  whatsappNumber?: string;
  availableSizes?: string[];
  price?: string;
  productNote?: string;
  createdAt: string;
  imageUrl: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  garmentFrontImageUrl?: string;
  garmentBackImageUrl?: string;
  galleryImageUrls?: string[];
};

type Store = {
  id: string;
  name: string;
  slug: string;
  address?: string;
  whatsappNumber?: string;
  createdAt: string;
};

type Lead = {
  id: string;
  lookId: string;
  visitorId?: string;
  name?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  createdAt: string;
};

type Generation = {
  id: string;
  lookId: string;
  visitorId?: string;
  storeName?: string;
  lookName?: string;
  imageUrl?: string;
  createdAt: string;
};

type AdminPayload = {
  activeLook?: Look;
  activeLooks?: Look[];
  stores?: Store[];
  looks?: Look[];
  events?: Array<{ id: string; name: string; lookId: string; createdAt: string; selectedSize?: string; storeName?: string; lookName?: string }>;
  leads?: Lead[];
  generations?: Generation[];
  error?: string;
};

const ADMIN_PIN_KEY = "luxurybandit-try-look-admin-pin";
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const SUPPORTED_IMAGE_MESSAGE = "Unsupported image format. Please upload JPG, PNG, or WebP.";

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Image could not be read."));
    reader.readAsDataURL(file);
  });

const validateImageFile = (file: File) => {
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(SUPPORTED_IMAGE_MESSAGE);
  }
};

const readJsonResponse = async <T,>(response: Response): Promise<T & { error?: string }> => {
  const text = await response.text();
  if (!text) return { error: `Server returned an empty response (${response.status}).` } as T & { error?: string };
  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    return { error: text.slice(0, 500) || "Server returned an invalid response." } as T & { error?: string };
  }
};

export default function AdminLooksPage() {
  const frontFileInputRef = useRef<HTMLInputElement | null>(null);
  const backFileInputRef = useRef<HTMLInputElement | null>(null);
  const garmentFrontFileInputRef = useRef<HTMLInputElement | null>(null);
  const garmentBackFileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryFileInputRef = useRef<HTMLInputElement | null>(null);
  const [pin, setPin] = useState("");
  const [selectedStoreSlug, setSelectedStoreSlug] = useState("");
  const [lookName, setLookName] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [availableSizes, setAvailableSizes] = useState("");
  const [price, setPrice] = useState("");
  const [productNote, setProductNote] = useState("");
  const [publicTryOnUrl, setPublicTryOnUrl] = useState("");
  const [newFrontLookImage, setNewFrontLookImage] = useState<string | null>(null);
  const [newBackLookImage, setNewBackLookImage] = useState<string | null>(null);
  const [newGarmentFrontImage, setNewGarmentFrontImage] = useState<string | null>(null);
  const [newGarmentBackImage, setNewGarmentBackImage] = useState<string | null>(null);
  const [newGalleryImages, setNewGalleryImages] = useState<string[]>([]);
  const [data, setData] = useState<AdminPayload>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvancedViews, setShowAdvancedViews] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async (adminPin = pin) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/try-this-look?admin=1", {
        headers: adminPin ? { "x-try-look-admin-pin": adminPin } : {}
      });
      const payload = await readJsonResponse<AdminPayload>(response);
      if (!response.ok) throw new Error(payload.error ?? "Admin data could not be loaded.");
      setData(payload);
      setSelectedStoreSlug((current) => {
        const nextSlug = current || payload.activeLook?.storeSlug || payload.stores?.[0]?.slug || "";
        const nextStore = payload.stores?.find((store) => store.slug === nextSlug);
        if (nextStore) {
          setStoreName(nextStore.name);
          setStoreSlug(nextStore.slug);
          setStoreAddress(nextStore.address ?? "");
          setWhatsappNumber(nextStore.whatsappNumber ?? "");
        }
        return nextSlug;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Admin data could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const storedPin = window.localStorage.getItem(ADMIN_PIN_KEY) ?? "";
    setPin(storedPin);
    setPublicTryOnUrl(`${window.location.origin}/try-this-look`);
    void loadData(storedPin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savePin = () => {
    window.localStorage.setItem(ADMIN_PIN_KEY, pin);
    void loadData(pin);
  };

  const normalizeSlug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>, view: "front" | "back" | "garment-front" | "garment-back") => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setMessage(null);
    try {
      validateImageFile(file);
      const dataUrl = await fileToDataUrl(file);
      if (view === "front") setNewFrontLookImage(dataUrl);
      else if (view === "back") setNewBackLookImage(dataUrl);
      else if (view === "garment-front") setNewGarmentFrontImage(dataUrl);
      else setNewGarmentBackImage(dataUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : SUPPORTED_IMAGE_MESSAGE);
      if (view === "front") setNewFrontLookImage(null);
      else if (view === "back") setNewBackLookImage(null);
      else if (view === "garment-front") setNewGarmentFrontImage(null);
      else setNewGarmentBackImage(null);
      event.target.value = "";
    }
  };

  const handleGalleryUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setError(null);
    setMessage(null);
    try {
      files.forEach(validateImageFile);
      const dataUrls = await Promise.all(files.map(fileToDataUrl));
      setNewGalleryImages((current) => [...current, ...dataUrls].slice(0, 12));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : SUPPORTED_IMAGE_MESSAGE);
    } finally {
      event.target.value = "";
    }
  };

  const callAdminAction = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/try-this-look", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(pin ? { "x-try-look-admin-pin": pin } : {})
      },
      body: JSON.stringify(body)
    });
    const payload = await readJsonResponse<AdminPayload>(response);
    if (!response.ok) throw new Error(payload.error ?? "Admin action failed.");
    setData(payload);
    return payload;
  };

  const uploadLook = async () => {
    if (!newFrontLookImage) {
      setError("Upload a campaign image first.");
      return;
    }
    if (!storeName.trim() || !storeSlug.trim()) {
      setError("Choose a store first, or enter a new store name and URL slug.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await callAdminAction({
        action: "upload-look",
        name: lookName.trim() || "New LuxuryBandit Look",
        campaignName: campaignName.trim() || "Instagram test",
        storeName: storeName.trim(),
        storeSlug: storeSlug.trim(),
        storeAddress: storeAddress.trim(),
        whatsappNumber: whatsappNumber.trim(),
        availableSizes: availableSizes
          .split(/[,\n]/)
          .map((size) => size.trim())
          .filter(Boolean),
        price: price.trim(),
        productNote: productNote.trim(),
        frontImage: newFrontLookImage,
        backImage: newBackLookImage,
        garmentFrontImage: newGarmentFrontImage,
        garmentBackImage: newGarmentBackImage,
        galleryImages: newGalleryImages
      });
      setSelectedStoreSlug(normalizeSlug(storeSlug));
      setNewFrontLookImage(null);
      setNewBackLookImage(null);
      setNewGarmentFrontImage(null);
      setNewGarmentBackImage(null);
      setNewGalleryImages([]);
      setLookName("");
      setCampaignName("");
      setAvailableSizes("");
      setPrice("");
      setProductNote("");
      setShowAdvancedViews(false);
      setMessage("New look is now active.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Look could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveStore = async () => {
    if (!storeName.trim() || !storeSlug.trim()) {
      setError("Store name and URL slug are required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await callAdminAction({
        action: "save-store",
        storeName: storeName.trim(),
        storeSlug: storeSlug.trim(),
        storeAddress: storeAddress.trim(),
        whatsappNumber: whatsappNumber.trim()
      });
      setSelectedStoreSlug(normalizeSlug(storeSlug));
      setMessage("Store saved.");
    } catch (storeError) {
      setError(storeError instanceof Error ? storeError.message : "Store could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectStore = (slug: string) => {
    setSelectedStoreSlug(slug);
    const store = (data.stores ?? []).find((item) => item.slug === slug);
    if (!store) return;
    setStoreName(store.name);
    setStoreSlug(store.slug);
    setStoreAddress(store.address ?? "");
    setWhatsappNumber(store.whatsappNumber ?? "");
    setMessage(null);
    setError(null);
  };

  const startNewStore = () => {
    setSelectedStoreSlug("");
    setStoreName("");
    setStoreSlug("");
    setStoreAddress("");
    setWhatsappNumber("");
    setLookName("");
    setCampaignName("");
    setAvailableSizes("");
    setPrice("");
    setProductNote("");
    setMessage(null);
    setError(null);
  };

  const setActiveLook = async (id: string) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await callAdminAction({ action: "set-active", id });
      setMessage("Look marked active.");
    } catch (activeError) {
      setError(activeError instanceof Error ? activeError.message : "Look could not be marked active.");
    } finally {
      setIsSaving(false);
    }
  };

  const unsetActiveLook = async (id: string) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await callAdminAction({ action: "unset-active", id });
      setMessage("Look removed from active looks.");
    } catch (activeError) {
      setError(activeError instanceof Error ? activeError.message : "Look could not be removed from active looks.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLook = async (look: Look) => {
    const confirmed = window.confirm(`Delete "${look.name}" from look history?`);
    if (!confirmed) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await callAdminAction({ action: "delete-look", id: look.id });
      setMessage("Look deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Look could not be deleted.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteGeneration = async (generation: Generation) => {
    const confirmed = window.confirm("Delete this generated image?");
    if (!confirmed) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await callAdminAction({ action: "delete-generation", id: generation.id });
      setSelectedGeneration(null);
      setMessage("Generated image deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Generated image could not be deleted.");
    } finally {
      setIsSaving(false);
    }
  };

  const eventCounts = (data.events ?? []).reduce<Record<string, number>>((counts, event) => {
    counts[event.name] = (counts[event.name] ?? 0) + 1;
    return counts;
  }, {});

  const funnelStats = [
    { label: "Page views", value: eventCounts.page_view_try_this_look ?? 0 },
    { label: "Photo uploads", value: eventCounts.upload_user_photo ?? 0 },
    { label: "Generate clicks", value: eventCounts.click_generate_my_look ?? 0 },
    { label: "Successful generations", value: eventCounts.generation_success ?? 0 },
    { label: "Failed generations", value: eventCounts.generation_failed ?? 0 },
    { label: "Size selections", value: eventCounts.select_size ?? 0 },
    { label: "WhatsApp order clicks", value: eventCounts.click_order_whatsapp ?? 0 },
    { label: "Saves", value: eventCounts.save_to_gallery ?? 0 },
    { label: "Downloads", value: eventCounts.download_result ?? 0 },
    { label: "Leads", value: eventCounts.lead_submitted ?? 0 }
  ];

  const copyText = async (text: string, success: string) => {
    await navigator.clipboard.writeText(text);
    setMessage(success);
  };

  const stores = data.stores ?? [];
  const selectedStore = stores.find((store) => store.slug === selectedStoreSlug);
  const looksForSelectedStore = (data.looks ?? []).filter((look) => {
    if (!selectedStoreSlug) return true;
    return look.storeSlug === selectedStoreSlug;
  });
  const selectedStoreActiveLook = selectedStoreSlug
    ? looksForSelectedStore.find((look) => look.id === data.activeLook?.id) ?? looksForSelectedStore[0]
    : data.activeLook;
  const activeLook = selectedStoreActiveLook;
  const activeLooks = (selectedStoreSlug
    ? (data.activeLooks ?? []).filter((look) => look.storeSlug === selectedStoreSlug)
    : data.activeLooks ?? []
  );
  const visibleActiveLooks = activeLooks.length ? activeLooks : activeLook ? [activeLook] : [];
  const activeLookIds = new Set(visibleActiveLooks.map((look) => look.id));
  const contactForGeneration = (generation: Generation) => {
    const leads = data.leads ?? [];
    if (generation.visitorId) {
      const directLead = leads.find((lead) => lead.visitorId === generation.visitorId);
      if (directLead) return directLead;
    }

    const generatedAt = new Date(generation.createdAt).getTime();
    return leads.find((lead) => {
      if (lead.lookId !== generation.lookId) return false;
      const leadAt = new Date(lead.createdAt).getTime();
      return leadAt >= generatedAt && leadAt - generatedAt < 1000 * 60 * 60 * 24;
    });
  };
  const activeLookPublicUrl = selectedStoreSlug ? `${publicTryOnUrl}?store=${selectedStoreSlug}` : activeLook?.storeSlug ? `${publicTryOnUrl}?store=${activeLook.storeSlug}` : publicTryOnUrl;
  const broadcastText = activeLook
    ? [
        `${activeLook.storeName ?? "LuxuryBandit"} just received ${activeLook.name}.`,
        "Try it on yourself with LuxuryBandit:",
        activeLookPublicUrl
      ].join("\n")
    : "";
  const isAdminAccessBlocked = error === "Admin access required." && !data.events;

  if (isAdminAccessBlocked) {
    return (
      <main className="min-h-screen bg-[#fbfaf7] px-4 py-5 text-ink">
        <section className="mx-auto grid w-full max-w-2xl gap-5">
          <header className="grid gap-2">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cobalt">LuxuryBandit Admin</div>
            <h1 className="text-5xl font-black leading-none text-ink">Try This Look</h1>
            <p className="max-w-3xl text-sm font-bold leading-6 text-ink/60">
              Enter the admin PIN to manage looks, leads, and generated images.
            </p>
          </header>

          <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
            <div className="text-lg font-black">Admin access</div>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                placeholder="Admin PIN"
                className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
              />
              <button type="button" onClick={savePin} className="h-12 rounded-md bg-ink px-5 text-sm font-black text-white">
                Load admin
              </button>
            </div>
            <p className="text-xs font-bold leading-5 text-ink/50">
              Set <span className="font-black">TRY_THIS_LOOK_ADMIN_PIN</span> in Vercel to control who can enter.
            </p>
          </section>

          <div className="rounded-md border border-coral/25 bg-coral/10 p-4 text-sm font-black text-coral">
            Admin PIN required.
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbfaf7] px-4 py-5 text-ink">
      <section className="mx-auto grid w-full max-w-6xl gap-5">
        <header className="grid gap-2">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-cobalt">LuxuryBandit Admin</div>
          <h1 className="text-5xl font-black leading-none text-ink">Try This Look</h1>
          <p className="max-w-3xl text-sm font-bold leading-6 text-ink/60">
            Change the active Instagram ad look, review look history, see generated images, and collect emails or Instagram handles.
          </p>
        </header>

        <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
          <div className="text-lg font-black">Admin access</div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="Admin PIN, optional for local MVP"
              className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
            />
            <button type="button" onClick={savePin} className="h-12 rounded-md bg-ink px-5 text-sm font-black text-white">
              Load admin
            </button>
          </div>
          <p className="text-xs font-bold leading-5 text-ink/50">
            For production, set <span className="font-black">TRY_THIS_LOOK_ADMIN_PIN</span> in your server environment.
          </p>
        </section>

        {error && <div className="rounded-md border border-coral/25 bg-coral/10 p-4 text-sm font-black text-coral">{error}</div>}
        {message && <div className="rounded-md border border-cobalt/20 bg-cobalt/10 p-4 text-sm font-black text-cobalt">{message}</div>}

        <section className="grid gap-4 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-cobalt">Store / client</div>
              <h2 className="mt-1 text-3xl font-black leading-none text-ink">Choose store first</h2>
              <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-ink/55">
                Select a boutique, enter its WhatsApp and address, then manage the look collection for this store.
              </p>
            </div>
            <button
              type="button"
              onClick={startNewStore}
              className="h-11 rounded-md border border-black/10 bg-panel px-4 text-sm font-black text-ink"
            >
              New store
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-[280px_1fr]">
            <div className="grid content-start gap-2">
              <select
                value={selectedStoreSlug}
                onChange={(event) => selectStore(event.target.value)}
                className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-black outline-none focus:border-cobalt"
              >
                <option value="">Create or choose store</option>
                {stores.map((store) => (
                  <option key={store.slug} value={store.slug}>
                    {store.name}
                  </option>
                ))}
              </select>
              {selectedStore && (
                <a
                  href={`/try-this-look?store=${selectedStore.slug}`}
                  className="inline-flex h-11 items-center justify-center rounded-md bg-cobalt px-4 text-sm font-black text-white"
                >
                  Open {selectedStore.name}
                </a>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={storeName}
                onChange={(event) => setStoreName(event.target.value)}
                placeholder="Store name, e.g. LuxuryBandit Boutique"
                className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
              />
              <input
              value={storeSlug}
                onChange={(event) => setStoreSlug(normalizeSlug(event.target.value))}
                placeholder="Store URL slug, e.g. laden"
                className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
              />
              <input
                value={storeAddress}
                onChange={(event) => setStoreAddress(event.target.value)}
                placeholder="Store address"
                className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
              />
              <input
                value={whatsappNumber}
                onChange={(event) => setWhatsappNumber(event.target.value)}
                placeholder="WhatsApp order number"
                className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
              />
              <button
                type="button"
                onClick={() => void saveStore()}
                disabled={isSaving}
                className="h-12 rounded-md bg-ink px-4 text-sm font-black text-white disabled:cursor-wait disabled:opacity-50 md:col-span-2"
              >
                Save store data
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-lg border border-black/10 bg-white p-4 shadow-soft lg:grid-cols-[360px_1fr]">
          <div className="grid gap-3">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-ink/45">Active looks</div>
            {visibleActiveLooks.length > 1 && (
              <div className="grid gap-3">
                {visibleActiveLooks.map((look) => (
                  <article key={look.id} className="grid gap-2 rounded-md border border-cobalt/20 bg-cobalt/10 p-3">
                    <img src={look.frontImageUrl ?? look.imageUrl} alt={look.name} className="aspect-square w-full rounded-md border border-black/10 bg-white object-contain" />
                    <div className="text-lg font-black">{look.name}</div>
                    <div className="text-xs font-black uppercase tracking-[0.12em] text-cobalt">{look.campaignName ?? "No campaign"}</div>
                    {look.price && <div className="text-sm font-black text-cobalt">{look.price}</div>}
                  </article>
                ))}
              </div>
            )}
            {visibleActiveLooks.length <= 1 && activeLook?.imageUrl && !activeLook?.backImageUrl && (
              <img src={activeLook.imageUrl} alt={activeLook.name} className="aspect-square w-full rounded-md border border-black/10 object-contain" />
            )}
            {visibleActiveLooks.length <= 1 && activeLook?.backImageUrl && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-ink/45">Front</div>
                  <img src={activeLook.frontImageUrl ?? activeLook.imageUrl} alt={`${activeLook.name} front`} className="aspect-square w-full rounded-md border border-black/10 object-contain" />
                </div>
                <div>
                  <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-ink/45">Back</div>
                  <img src={activeLook.backImageUrl} alt={`${activeLook.name} back`} className="aspect-square w-full rounded-md border border-black/10 object-contain" />
                </div>
              </div>
            )}
            <div>
              <div className="text-2xl font-black">
                {visibleActiveLooks.length > 1 ? `${visibleActiveLooks.length} active looks` : activeLook?.name ?? "No active look for this store"}
              </div>
              <div className="mt-1 text-sm font-bold text-ink/50">
                {visibleActiveLooks.length > 1 ? "Shown as active in this admin collection" : activeLook?.campaignName ?? "No campaign name"}
              </div>
              {activeLook?.storeName && <div className="mt-2 text-sm font-black text-ink">{activeLook.storeName}</div>}
              {activeLook?.storeAddress && <div className="mt-1 text-sm font-bold text-ink/55">{activeLook.storeAddress}</div>}
              {activeLook?.whatsappNumber && <div className="mt-1 text-sm font-bold text-ink/55">WhatsApp: {activeLook.whatsappNumber}</div>}
              {activeLook?.price && <div className="mt-1 text-sm font-black text-cobalt">{activeLook.price}</div>}
              {(activeLook?.availableSizes ?? []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {(activeLook?.availableSizes ?? []).map((size) => (
                    <span key={size} className="rounded-full bg-panel px-3 py-1 text-xs font-black text-ink/70">
                      {size}
                    </span>
                  ))}
                </div>
              )}
              {(activeLook?.galleryImageUrls ?? []).length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {(activeLook?.galleryImageUrls ?? []).slice(0, 4).map((image, index) => (
                    <img
                      key={`${image}-${index}`}
                      src={image}
                      alt={`Active product gallery image ${index + 1}`}
                      className="aspect-square rounded-md border border-black/10 bg-white object-cover object-top"
                    />
                  ))}
                </div>
              )}
              {activeLook && (
                <div className="mt-2 inline-flex rounded-full bg-cobalt/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-cobalt">
                  {visibleActiveLooks.length > 1 ? "Multiple active" : "Active"}
                </div>
              )}
            </div>
            <a href={selectedStoreSlug ? `/try-this-look?store=${selectedStoreSlug}` : "/try-this-look"} className="inline-flex h-12 items-center justify-center rounded-md bg-cobalt px-4 text-sm font-black text-white">
              Open user page
            </a>
            <button
              type="button"
              onClick={() => void copyText(activeLookPublicUrl, "Public try-on link copied.")}
              className="inline-flex h-12 items-center justify-center rounded-md border border-black/10 bg-panel px-4 text-sm font-black text-ink"
            >
              Copy public try-on link
            </button>
            {activeLook && (
              <button
                type="button"
                onClick={() => void copyText(broadcastText, "WhatsApp broadcast text copied.")}
                className="inline-flex h-12 items-center justify-center rounded-md border border-cobalt/20 bg-cobalt/10 px-4 text-sm font-black text-cobalt"
              >
                Copy WhatsApp broadcast text
              </button>
            )}
          </div>

          <div className="grid content-start gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-ink/45">Upload new look</div>
              <div className="mt-1 text-sm font-bold text-ink/55">
                {selectedStore ? `Collection for ${selectedStore.name}` : "Choose or save a store before uploading a look."}
              </div>
            </div>
            <input ref={frontFileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleImageUpload(event, "front")} />
            <input ref={backFileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleImageUpload(event, "back")} />
            <input ref={garmentFrontFileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleImageUpload(event, "garment-front")} />
            <input ref={garmentBackFileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleImageUpload(event, "garment-back")} />
            <input ref={galleryFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => void handleGalleryUpload(event)} />
            <div className="rounded-md border border-cobalt/20 bg-cobalt/5 p-3 text-sm font-bold leading-6 text-ink/60">
              For the Instagram test, upload one main campaign image and optional product gallery images. Customers can swipe through the gallery on mobile before they try the look.
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => frontFileInputRef.current?.click()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-cobalt/25 bg-cobalt/10 px-4 text-sm font-black text-cobalt"
              >
                <ImagePlus aria-hidden="true" className="h-4 w-4" />
                Upload campaign image
              </button>
              <button
                type="button"
                onClick={() => garmentFrontFileInputRef.current?.click()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-cobalt/25 bg-cobalt/10 px-4 text-sm font-black text-cobalt"
              >
                <ImagePlus aria-hidden="true" className="h-4 w-4" />
                Upload clean garment reference
              </button>
            </div>
            <button
              type="button"
              onClick={() => galleryFileInputRef.current?.click()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-black/10 bg-panel px-4 text-sm font-black text-ink"
            >
              <ImagePlus aria-hidden="true" className="h-4 w-4" />
              Upload product gallery images
            </button>
            <div className="rounded-md border border-black/10 bg-panel p-3">
              <button
                type="button"
                onClick={() => setShowAdvancedViews((value) => !value)}
                className="flex w-full items-center justify-between text-left text-sm font-black text-ink"
              >
                <span>Advanced: front/back views</span>
                <span>{showAdvancedViews ? "Hide" : "Show"}</span>
              </button>
              {showAdvancedViews && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => backFileInputRef.current?.click()}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-4 text-sm font-black text-ink"
                  >
                    <ImagePlus aria-hidden="true" className="h-4 w-4" />
                    Optional back campaign image
                  </button>
                  <button
                    type="button"
                    onClick={() => garmentBackFileInputRef.current?.click()}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-4 text-sm font-black text-ink"
                  >
                    <ImagePlus aria-hidden="true" className="h-4 w-4" />
                    Optional back garment reference
                  </button>
                </div>
              )}
            </div>
            {(newFrontLookImage || newBackLookImage || newGarmentFrontImage || newGarmentBackImage) && (
              <div className="grid gap-3 md:grid-cols-2">
                {newFrontLookImage && (
                  <div>
                    <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-cobalt">Campaign image</div>
                    <img src={newFrontLookImage} alt="New front look preview" className="max-h-[360px] w-full rounded-md border border-black/10 object-contain" />
                  </div>
                )}
                {newBackLookImage && (
                  <div>
                    <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-ink/45">Back campaign</div>
                    <img src={newBackLookImage} alt="New back look preview" className="max-h-[360px] w-full rounded-md border border-black/10 object-contain" />
                  </div>
                )}
                {newGarmentFrontImage && (
                  <div>
                    <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-cobalt">Clean garment reference</div>
                    <img src={newGarmentFrontImage} alt="New front garment reference preview" className="max-h-[360px] w-full rounded-md border border-cobalt/20 object-contain" />
                  </div>
                )}
                {newGarmentBackImage && (
                  <div>
                    <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-ink/45">Back AI garment reference</div>
                    <img src={newGarmentBackImage} alt="New back garment reference preview" className="max-h-[360px] w-full rounded-md border border-cobalt/20 object-contain" />
                  </div>
                )}
              </div>
            )}
            {newGalleryImages.length > 0 && (
              <div className="grid gap-2 rounded-md border border-black/10 bg-panel p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-ink/45">Product gallery</div>
                    <div className="text-sm font-bold text-ink/55">{newGalleryImages.length} customer swipe images</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewGalleryImages([])}
                    className="h-9 rounded-md border border-coral/30 bg-coral/10 px-3 text-xs font-black text-coral"
                  >
                    Clear
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                  {newGalleryImages.map((image, index) => (
                    <div key={`${image.slice(0, 32)}-${index}`} className="relative rounded-md border border-black/10 bg-white p-1">
                      <img src={image} alt={`Product gallery preview ${index + 1}`} className="aspect-square w-full rounded object-cover object-top" />
                      <button
                        type="button"
                        onClick={() => setNewGalleryImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        className="absolute right-1 top-1 rounded bg-white/90 px-2 py-1 text-[10px] font-black text-coral shadow"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <input
              value={lookName}
              onChange={(event) => setLookName(event.target.value)}
              placeholder="Public look name, e.g. LuxuryBandit Leopard Look"
              className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
            />
            <input
              value={campaignName}
              onChange={(event) => setCampaignName(event.target.value)}
              placeholder="Campaign name, e.g. June Instagram Drop"
              className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
            />
            <input
              value={availableSizes}
              onChange={(event) => setAvailableSizes(event.target.value)}
              placeholder="Available sizes, e.g. XS, S, M, L"
              className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
            />
            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Price optional, e.g. 129 EUR"
              className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
            />
            <textarea
              value={productNote}
              onChange={(event) => setProductNote(event.target.value)}
              placeholder="Product note optional, e.g. Limited drop, handmade, available this week."
              className="min-h-24 rounded-md border border-black/10 bg-panel p-3 text-sm font-bold outline-none focus:border-cobalt"
            />
            <button
              type="button"
              onClick={() => void uploadLook()}
              disabled={isSaving}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-coral px-4 text-sm font-black text-white disabled:cursor-wait disabled:opacity-50"
            >
              {isSaving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Sparkles aria-hidden="true" className="h-4 w-4" />}
              Save and make active
            </button>
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black">Look history</h2>
            <button type="button" onClick={() => void loadData()} className="inline-flex h-10 items-center gap-2 rounded-md bg-panel px-3 text-sm font-black">
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Refresh
            </button>
          </div>
          {isLoading ? (
            <div className="text-sm font-black text-ink/50">Loading...</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {looksForSelectedStore.length === 0 && (
                <div className="rounded-md border border-black/10 bg-panel p-4 text-sm font-bold text-ink/55 sm:col-span-2 lg:col-span-4">
                  No looks for this store yet. Upload the first look for this boutique above.
                </div>
              )}
              {looksForSelectedStore.map((look) => {
                const active = activeLookIds.has(look.id);
                return (
                  <article key={look.id} className={`grid gap-2 rounded-md border p-3 ${active ? "border-cobalt bg-cobalt/10" : "border-black/10 bg-panel"}`}>
                    <div className={`grid gap-1 ${look.backImageUrl ? "grid-cols-2" : ""}`}>
                      <img src={look.frontImageUrl ?? look.imageUrl} alt={`${look.name} front`} className="aspect-square w-full rounded-md border border-black/10 bg-white object-contain" />
                      {look.backImageUrl && (
                        <img src={look.backImageUrl} alt={`${look.name} back`} className="aspect-square w-full rounded-md border border-black/10 bg-white object-contain" />
                      )}
                    </div>
                    {look.backImageUrl && <div className="rounded-full bg-cobalt/10 px-2 py-1 text-center text-[10px] font-black uppercase tracking-[0.12em] text-cobalt">Front + Back</div>}
                    {(look.galleryImageUrls ?? []).length > 0 && (
                      <div className="rounded-full bg-panel px-2 py-1 text-center text-[10px] font-black uppercase tracking-[0.12em] text-ink/50">
                        {(look.galleryImageUrls ?? []).length} gallery images
                      </div>
                    )}
                    <div className="font-black">{look.name}</div>
                    <div className="text-xs font-black uppercase tracking-[0.12em] text-cobalt/70">
                      {look.campaignName ?? "No campaign"}
                    </div>
                    {look.storeName && <div className="text-xs font-black text-ink/60">{look.storeName}</div>}
                    {look.storeSlug && <div className="text-xs font-bold text-cobalt">/try-this-look?store={look.storeSlug}</div>}
                    {look.storeAddress && <div className="text-xs font-bold text-ink/45">{look.storeAddress}</div>}
                    {(look.availableSizes ?? []).length > 0 && (
                      <div className="text-xs font-bold text-ink/45">Sizes: {(look.availableSizes ?? []).join(", ")}</div>
                    )}
                    <div className="text-xs font-bold text-ink/45">{new Date(look.createdAt).toLocaleString()}</div>
                    <button
                      type="button"
                      disabled={active || isSaving}
                      onClick={() => void setActiveLook(look.id)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-3 text-xs font-black text-white disabled:bg-cobalt disabled:opacity-100"
                    >
                      {active && <Check aria-hidden="true" className="h-4 w-4" />}
                      {active ? "Active" : "Make active"}
                    </button>
                    {active && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void unsetActiveLook(look.id)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-3 text-xs font-black text-ink disabled:cursor-wait disabled:opacity-50"
                      >
                        Remove active
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isSaving || (data.looks ?? []).length <= 1}
                      onClick={() => void deleteLook(look)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-coral/30 bg-coral/10 px-3 text-xs font-black text-coral disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                      Delete
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="grid gap-2 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
            <h2 className="text-2xl font-black">Funnel stats</h2>
            {funnelStats.some((item) => item.value > 0) ? (
              funnelStats.map((item) => (
                <div key={item.label} className="flex items-center justify-between border-b border-black/5 py-2 text-sm font-black">
                  <span>{item.label}</span>
                  <span className="text-cobalt">{item.value}</span>
                </div>
              ))
            ) : (
              <p className="text-sm font-bold text-ink/50">No events yet.</p>
            )}
          </div>

          <div className="grid gap-2 rounded-lg border border-black/10 bg-white p-4 shadow-soft lg:col-span-2">
            <h2 className="text-2xl font-black">Contacts</h2>
            {(data.leads ?? []).length ? (
              <div className="grid gap-2">
                {(data.leads ?? []).map((lead) => (
                  <div key={lead.id} className="rounded-md border border-black/10 bg-panel p-3 text-sm font-bold">
                    <div className="text-base font-black">{lead.name || "No name"}</div>
                    <div>{lead.phone || "No phone"}</div>
                    <div>{lead.email || "No email"}</div>
                    <div>{lead.instagram || "No Instagram"}</div>
                    <div className="mt-1 text-xs text-ink/45">{new Date(lead.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-bold text-ink/50">No contacts yet.</p>
            )}
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
          <h2 className="text-2xl font-black">Generated images</h2>
          {(data.generations ?? []).length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(data.generations ?? []).map((generation) => {
                const contact = contactForGeneration(generation);
                return (
                  <article key={generation.id} className="grid gap-2 rounded-md border border-black/10 bg-panel p-3">
                    {generation.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setSelectedGeneration(generation)}
                        className="group overflow-hidden rounded-md border border-black/10 bg-white"
                        title="Open large"
                      >
                        <img src={generation.imageUrl} alt="Generated look" className="aspect-square w-full object-contain transition group-hover:scale-[1.02]" />
                      </button>
                    )}
                    <div className="grid gap-1 text-xs font-bold text-ink/55">
                      <div className="font-black text-ink">{generation.lookName ?? "Generated look"}</div>
                      <div>{new Date(generation.createdAt).toLocaleString()}</div>
                      <div className="rounded-md border border-black/10 bg-white p-2">
                        <div className="font-black text-ink">Customer</div>
                        <div>{contact?.name || "No name yet"}</div>
                        <div>{contact?.phone || "No phone yet"}</div>
                        <div>{contact?.email || "No email yet"}</div>
                        <div>{contact?.instagram || "No Instagram yet"}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteGeneration(generation)}
                      disabled={isSaving}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-coral/30 bg-coral/10 px-3 text-xs font-black text-coral disabled:cursor-wait disabled:opacity-50"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                      Delete
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-sm font-bold text-ink/50">No generated images yet.</p>
          )}
        </section>
      </section>
      {selectedGeneration?.imageUrl && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="grid max-h-[92vh] w-full max-w-5xl gap-3 overflow-auto rounded-lg bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-2xl font-black text-ink">{selectedGeneration.lookName ?? "Generated look"}</div>
                <div className="mt-1 text-sm font-bold text-ink/55">{new Date(selectedGeneration.createdAt).toLocaleString()}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGeneration(null)}
                className="h-11 rounded-md border border-black/10 bg-panel px-4 text-sm font-black text-ink"
              >
                Close
              </button>
            </div>
            <img src={selectedGeneration.imageUrl} alt="Generated look large" className="max-h-[72vh] w-full rounded-md border border-black/10 object-contain" />
            <div className="grid gap-2 rounded-md border border-black/10 bg-panel p-3 text-sm font-bold text-ink/65">
              {(() => {
                const contact = contactForGeneration(selectedGeneration);
                return (
                  <>
                    <div className="text-lg font-black text-ink">Customer</div>
                    <div>Name: {contact?.name || "No name yet"}</div>
                    <div>Phone: {contact?.phone || "No phone yet"}</div>
                    <div>Email: {contact?.email || "No email yet"}</div>
                    <div>Instagram: {contact?.instagram || "No Instagram yet"}</div>
                  </>
                );
              })()}
            </div>
            <button
              type="button"
              onClick={() => void deleteGeneration(selectedGeneration)}
              disabled={isSaving}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-coral/30 bg-coral/10 px-4 text-sm font-black text-coral disabled:cursor-wait disabled:opacity-50"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              Delete generated image
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
