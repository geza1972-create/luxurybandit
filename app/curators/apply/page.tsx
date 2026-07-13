"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Sparkles, Loader2, Check, Coins } from "lucide-react";
import { TagField, PhotoCropper, readPhotoFile } from "../taste-form";

export default function CuratorApplyPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState("");
  const [photoFull, setPhotoFull] = useState(""); // the UNCROPPED original (portrait) — shown large on her profile
  const [photoError, setPhotoError] = useState("");
  const [cropSrc, setCropSrc] = useState("");
  // Candidate PROFILE photos (up to 4) — she uploads several, the admin picks her best one.
  const [profilePhotos, setProfilePhotos] = useState<string[]>([]); // new picks (cropped data URLs)
  const [profileExisting, setProfileExisting] = useState<string[]>([]); // edit mode: already stored
  const [profileCropSrc, setProfileCropSrc] = useState(""); // photo waiting to be cropped
  const profileFileRef = useRef<HTMLInputElement>(null);
  // Full-body dressed photos (3:4 crop, up to 2) — the try-on references.
  const [bodyPhotos, setBodyPhotos] = useState<string[]>([]); // new picks (data URLs)
  const [bodyExisting, setBodyExisting] = useState<string[]>([]); // edit mode: already stored
  const [bodyCropSrc, setBodyCropSrc] = useState("");
  const bodyFileRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [instagram, setInstagram] = useState("");
  // Taste — chip fields backed by growing databases
  const [brandChips, setBrandChips] = useState<string[]>([]);
  const [styleChips, setStyleChips] = useState<string[]>([]);
  const [colorChips, setColorChips] = useState<string[]>([]);
  const [fabricChips, setFabricChips] = useState<string[]>([]);
  const [occasionChips, setOccasionChips] = useState<string[]>([]);
  // Taste — fixed pill selectors
  const [genderFocus, setGenderFocus] = useState("");
  const [priceTiers, setPriceTiers] = useState<string[]>([]);
  const [fitFocus, setFitFocus] = useState<string[]>([]);
  // CONCEPT 2.0 creation tool: which role model's STYLE you emulate + where your face comes from.
  const [styleModelId, setStyleModelId] = useState("");
  const [imageSource, setImageSource] = useState<"own" | "ours">("own"); // own photos (you) vs our images (anti-deepfake: never someone else's face)
  const [roleModels, setRoleModels] = useState<{ id: string; name: string; photoUrl?: string }[]>([]);
  const [avatarFaces, setAvatarFaces] = useState<{ id: string; imageUrl: string; claimed: boolean }[]>([]);
  const [avatarFaceId, setAvatarFaceId] = useState(""); // the FREE face this creator picks (booked on $3.99 payment)
  const [appliedCuratorId, setAppliedCuratorId] = useState(""); // returned by apply → needed to buy the face
  const [appliedFaceId, setAppliedFaceId] = useState("");
  const [reserving, setReserving] = useState(false);
  const [faceReserved, setFaceReserved] = useState(false);

  const [db, setDb] = useState<{ brands: string[]; styles: string[]; colors: string[]; fabrics: string[]; occasions: string[] }>(
    { brands: [], styles: [], colors: [], fabrics: [], occasions: [] }
  );
  useEffect(() => {
    fetch("/api/curator").then(r => r.json()).then((d: any) => {
      setDb({ brands: d.brands ?? [], styles: d.styles ?? [], colors: d.colors ?? [], fabrics: d.fabrics ?? [], occasions: d.occasions ?? [] });
    }).catch(() => {});
    // Role models to emulate (style templates).
    fetch("/api/try-this-look?models=1").then(r => r.json()).then((d: any) => {
      setRoleModels((d.models ?? []).filter((m: any) => m.photoUrl).slice(0, 40));
    }).catch(() => {});
    // AI-face library (for the "our images" path).
    fetch("/api/try-this-look?avatarFaces=1").then(r => r.json()).then((d: any) => {
      setAvatarFaces(Array.isArray(d.faces) ? d.faces : []);
    }).catch(() => {});
  }, []);

  const brands = brandChips.join(", ");
  const style = styleChips.join(", ");

  const [motto, setMotto] = useState("");
  const [bio, setBio] = useState("");
  const [aiHint, setAiHint] = useState(""); // rough free-text for the AI (optional)

  const [mottoIdeas, setMottoIdeas] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false); // 18+, real me, accepts the model rules
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");

  // Insights: recruiting funnel steps 2+3 (form opened / application sent).
  const trackRecruit = (event: string) => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const internal = !!localStorage.getItem("luxurybandit-try-look-admin-pin") && localStorage.getItem("lb_preview_model") !== "1";
      fetch("/api/try-this-look", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "event", event, lookId: "recruiting", lookName: "Recruiting", utmSource: sp.get("utm_source") || sp.get("source") || "", referrer: document.referrer || "", internal }),
      }).catch(() => {});
    } catch { /**/ }
  };
  const viewTracked = useRef(false); // StrictMode guard
  useEffect(() => {
    if (viewTracked.current) return;
    viewTracked.current = true;
    // Edit mode is the ADMIN reusing this form — never a funnel step.
    if (!new URLSearchParams(window.location.search).get("edit")) trackRecruit("apply_view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Edit mode: /admin/curators/apply?edit=<id> opens this SAME form prefilled
  // with an existing model and saves via the "update" action (admin only).
  const [editId, setEditId] = useState("");
  const [savedDone, setSavedDone] = useState<{ photo: string } | null>(null); // success confirmation
  const getPin = () => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } };
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("edit") || "";
    if (!id) return;
    setEditId(id);
    fetch("/api/try-this-look?curators=1", { headers: { "x-try-look-admin-pin": getPin() } })
      .then(r => r.json())
      .then((d: any) => {
        const c = (d.curators ?? []).find((x: any) => x.id === id);
        if (!c) { setError("Model not found."); return; }
        const split = (s?: string) => String(s ?? "").split(",").map(t => t.trim()).filter(Boolean);
        setFirstName(c.firstName ?? ""); setLastName(c.lastName ?? "");
        setEmail(c.email ?? ""); setPhone(c.phone ?? ""); setAddress(c.address ?? "");
        setInstagram(c.instagram ?? "");
        setBrandChips(split(c.brands)); setStyleChips(split(c.style));
        setColorChips(split(c.colors)); setFabricChips(split(c.fabrics)); setOccasionChips(split(c.occasions));
        setGenderFocus(c.genderFocus ?? ""); setPriceTiers(split(c.priceTiers)); setFitFocus(split(c.fitFocus));
        setMotto(c.motto ?? ""); setBio(c.bio ?? "");
        if (c.photoUrl) setPhoto(c.photoUrl); // signed URL — only re-sent if she picks a new one
        setBodyExisting(Array.isArray(c.photoBodyUrls) ? c.photoBodyUrls : []);
        // Existing candidate profile photos (edit mode) — show them; new picks replace the set.
        setProfileExisting(Array.isArray(c.profilePhotoUrls) && c.profilePhotoUrls.length
          ? c.profilePhotoUrls : (c.photoUrl ? [c.photoUrl] : []));
      })
      .catch(() => setError("Could not load the model."));
  }, []);

  // Cancel/back: from the admin ("New model") this returns to the Models list;
  // from the public signup it just goes back to wherever the user came from.
  const cancel = () => {
    if (window.location.pathname.startsWith("/admin")) router.push("/admin?tab=curators");
    else router.back();
  };

  const onPickPhoto = async (file?: File) => {
    if (!file) return;
    setPhotoError("");
    const { src, error } = await readPhotoFile(file);
    if (error) { setPhotoError(error); return; }
    if (src) setCropSrc(src);
  };
  const onPickBody = async (file?: File) => {
    if (!file) return;
    setPhotoError("");
    const { src, error } = await readPhotoFile(file);
    if (error) { setPhotoError(error); return; }
    if (src) setBodyCropSrc(src);
  };
  // Add a candidate profile photo (raw, no crop — the profile shows it via object-cover). Max 4.
  const onPickProfile = async (file?: File) => {
    if (!file) return;
    setPhotoError("");
    const { src, error } = await readPhotoFile(file);
    if (error) { setPhotoError(error); return; }
    if (src) setProfileCropSrc(src); // crop it first, then it's added
  };

  const suggest = async () => {
    setError(""); setSuggesting(true);
    try {
      const res = await fetch("/api/curator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suggest", brands, style, hint: aiHint }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || "Could not get suggestions."); return; }
      setMottoIdeas(Array.isArray(data.mottos) ? data.mottos : []);
      // She asked for suggestions — apply them (she can still edit or pick another motto).
      if (data.bio) setBio(data.bio);
      if (data.mottos?.[0]) setMotto(data.mottos[0]);
    } catch {
      setError("Could not get suggestions.");
    } finally {
      setSuggesting(false);
    }
  };

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("First name, last name and email are required."); return;
    }
    if (!agreed) { setError("Please confirm you're 18+, the photos are really you, and you accept the model rules."); return; }
    setError(""); setSubmitting(true);
    try {
      const shared = {
        firstName, lastName, email, phone, address, instagram, brands, style, motto, bio,
        genderFocus, styleModelId, imageSource, ...(imageSource === "ours" && avatarFaceId ? { avatarFaceId } : {}), consent: agreed, consentText: "18+, photos are really me, accept model rules & terms",
        colors: colorChips.join(", "),
        fabrics: fabricChips.join(", "),
        occasions: occasionChips.join(", "),
        priceTiers: priceTiers.join(", "),
        fitFocus: fitFocus.join(", "),
      };

      if (editId) {
        // Edit mode: save changes to the existing model, then back to the list.
        const res = await fetch("/api/curator", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-try-look-admin-pin": getPin() },
          body: JSON.stringify({
            action: "update", id: editId, ...shared,
            // New profile-photo picks REPLACE the candidate set (admin then picks the main).
            ...(profilePhotos.length ? { profilePhotos } : {}),
            // Only send the photo if she picked a NEW one (data URL) — a signed
            // URL from prefill means "unchanged". The uncropped original goes along.
            ...(photo.startsWith("data:image/") ? { photo, ...(photoFull.startsWith("data:image/") ? { photoFull } : {}) } : {}),
            // New full-body picks REPLACE the stored set; none picked = unchanged.
            ...(bodyPhotos.length ? { bodyPhotos } : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) { setError(data.error || "Could not save."); return; }
        // Explicit confirmation (with the new photo as proof) instead of a silent redirect.
        setSavedDone({ photo: profilePhotos[0] || (photo.startsWith("data:image/") ? photo : "") });
        return;
      }

      const res = await fetch("/api/curator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", ...shared, ...(profilePhotos.length ? { profilePhotos } : {}), ...(photo.startsWith("data:image/") ? { photo, ...(photoFull.startsWith("data:image/") ? { photoFull } : {}) } : {}), ...(bodyPhotos.length ? { bodyPhotos } : {}) }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || "Could not submit."); return; }
      // Applications are REVIEWED — no session yet. (If the API ever auto-approves
      // again it returns `curator`, which we'd store; pending returns none.)
      if (data.curator?.id) {
        try { localStorage.setItem("lb_curator", JSON.stringify(data.curator)); } catch { /**/ }
        try { window.dispatchEvent(new Event("luxurybandit-auth-updated")); } catch { /**/ }
      }
      trackRecruit("apply_submit");
      setAppliedCuratorId(data.curatorId || "");
      setAppliedFaceId(data.avatarFaceId || "");
      setApplied(true);
    } catch {
      setError("Could not submit.");
    } finally {
      setSubmitting(false);
    }
  };

  // $3.99 to lock the chosen unique AI face — Stripe popup + poll, then it's booked to her.
  const reserveFace = async () => {
    if (reserving || !appliedFaceId || !appliedCuratorId) return;
    setReserving(true);
    try {
      const r = await fetch("/api/avatar-face-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ faceId: appliedFaceId, curatorId: appliedCuratorId }) }).then(x => x.json()).catch(() => null);
      if (!r?.url || !r?.sessionId) { alert(r?.error || "Payment isn't available yet."); setReserving(false); return; }
      const popup = window.open(r.url, "lb-pay", "width=460,height=760");
      for (let i = 0; i < 180; i++) {
        await new Promise(res => setTimeout(res, 2000));
        const st = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(r.sessionId)}`).then(x => x.json()).catch(() => ({}));
        if (st?.paid) { try { popup?.close(); } catch { /**/ } setFaceReserved(true); break; }
        if (popup && popup.closed) { const st2 = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(r.sessionId)}`).then(x => x.json()).catch(() => ({})); if (st2?.paid) setFaceReserved(true); break; }
      }
    } catch { alert("Payment failed."); }
    finally { setReserving(false); }
  };

  // Neutral field styling — matches the profile form (no gold-everywhere).
  const field = "h-12 w-full rounded-xl border border-black/12 bg-black/[0.03] px-4 text-sm font-bold text-ink outline-none focus:border-black/40 placeholder:text-ink/30";
  const label = "mb-1 block text-[11px] font-black uppercase tracking-wider text-ink/45";

  if (applied) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#faf7f0] px-6 text-center text-ink">
        <div className="max-w-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-400 text-2xl text-black">✓</div>
          <h1 className="mt-4 text-xl font-black text-ink">Application received{firstName ? `, ${firstName}` : ""}!</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-ink/55">
            Our team reviews every LuxuryBandit Influencer personally. You&apos;ll get an email as soon
            as you&apos;re approved — then just sign in and start earning.
          </p>
          {appliedFaceId && (
            faceReserved ? (
              <p className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.08] px-4 py-3 text-[13px] font-black text-emerald-700">✓ Your face is reserved — it&apos;s yours alone. 💛</p>
            ) : (
              <div className="mt-4">
                <p className="text-[12px] font-bold text-ink/50">Lock your unique face before someone else picks it:</p>
                <button type="button" disabled={reserving} onClick={() => void reserveFace()}
                  className="lb-gold mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-6 text-sm font-black active:scale-95 transition disabled:opacity-50">
                  {reserving ? "…" : "🔒 Reserve my face — $3.99"}
                </button>
              </div>
            )
          )}
          <button type="button" onClick={() => router.push("/stores")}
            className="lb-gold mt-5 inline-flex h-12 items-center justify-center rounded-2xl px-6 text-sm font-black active:scale-95 transition-transform">
            Back to LuxuryBandit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#faf7f0] text-ink" style={{ paddingBottom: "calc(130px + env(safe-area-inset-bottom))" }}>
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/10 bg-[#faf7f0]/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={cancel}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/15 text-ink active:scale-90 transition-transform">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="flex-1 text-sm font-black text-ink">{editId ? `Edit model${firstName ? ` — ${firstName}` : ""}` : "Become a LuxuryBandit Model"}</p>
        <button type="button" onClick={cancel}
          className="shrink-0 rounded-full border border-black/15 px-4 py-2 text-xs font-black text-ink/70 active:scale-95 transition-transform">
          Cancel
        </button>
      </div>

      <div className="px-5 pt-6">
        {/* Hero — signup pitch only; skipped when editing an existing model.
            The campaign banner stays visible until she completes the signup. */}
        {!editId && <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/become-a-model-banner.jpg" alt="Become a LuxuryBandit Influencer and make money daily"
            className="mb-4 w-full rounded-2xl border border-amber-400/30" />
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_0_30px_rgba(251,191,36,0.35)]">
            <Coins className="h-7 w-7 text-black" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">AI Virtual Try-On · Luxury Fashion</p>
          <h1 className="mt-2 text-[28px] font-black leading-tight text-ink">
            Sign up &amp; earn money <span className="text-amber-400">with every look.</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-sm font-semibold leading-6 text-ink/55">
            Get styled in high-end outfits by AI — and get paid every time someone tries on your look.
          </p>
        </div>}

        {/* One-shot warning — sets expectations before she uploads. */}
        <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3 text-center">
          <p className="text-[13px] font-black text-amber-700">⚠️ You get one shot — send your very best photos.</p>
          <p className="mt-1 text-[11px] font-bold leading-relaxed text-ink/55">Photos that are blurry, hide your face (hat/sunglasses), fake, or don&apos;t fit our luxury concept are rejected — and a rejected application can&apos;t apply again. Sharp, well-lit, real photos only.</p>
          <p className="mt-2 text-[11px] font-bold leading-relaxed text-emerald-700">💰 You earn <b className="text-emerald-700">30%</b> (~$1.20) every time a fan makes a paid video with you — it lands in your account automatically. The more fans pick you, the more you earn. <a href="/earnings" className="underline underline-offset-2">How earnings work →</a></p>
          <p className="mt-2 text-[11px] font-bold leading-relaxed text-amber-700">🎬 Your first video is free — turn a photo into a video once you&apos;re approved. Every extra video is just $3.99.</p>
          <p className="mt-2 text-[11px] font-bold leading-relaxed text-ink/70">💡 <b className="text-ink">You&apos;re never on your own.</b> Every single day we hand you fresh <b className="text-ink">outfits and video ideas</b> — you just post. No ideas needed, we do the creative work.</p>
          <p className="mt-2 text-[11px] font-bold leading-relaxed text-ink/70">🤖 <b className="text-ink">A free AI chat assistant for your fans</b> — it chats with them for you, day and night. You have <b className="text-ink">zero work</b> with it.</p>
        </div>

        {/* CONCEPT 2.0 creation tool — role model (style template) + face source (anti-deepfake). */}
        <div className="mt-5 rounded-2xl border border-black/10 bg-black/[0.03] p-4">
          <span className={label}>Your role model · style template</span>
          <p className="mt-0.5 text-[11px] font-bold text-ink/40">Pick who you want to be like. We give you a similar style — with YOUR own look, never a copy.</p>
          <div className="mt-2 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {roleModels.map(m => (
              <button key={m.id} type="button" onClick={() => setStyleModelId(id => id === m.id ? "" : m.id)}
                className={`shrink-0 text-center transition ${styleModelId === m.id ? "" : "opacity-70 hover:opacity-100"}`}>
                <span className={`block h-16 w-16 overflow-hidden rounded-full border-2 ${styleModelId === m.id ? "border-amber-400" : "border-black/10"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.photoUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                </span>
                <span className="mt-1 block w-16 truncate text-[10px] font-bold text-ink/60">{m.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>

          <span className={`${label} mt-4`}>Whose face?</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setImageSource("own")}
              className={`rounded-xl border px-3 py-2.5 text-center text-[12px] font-black transition ${imageSource === "own" ? "border-amber-400 bg-amber-400/10 text-amber-700" : "border-black/12 text-ink/60"}`}>
              📸 My own photos<br /><span className="text-[10px] font-bold opacity-70">You become the influencer</span>
            </button>
            <button type="button" onClick={() => setImageSource("ours")}
              className={`rounded-xl border px-3 py-2.5 text-center text-[12px] font-black transition ${imageSource === "ours" ? "border-amber-400 bg-amber-400/10 text-amber-700" : "border-black/12 text-ink/60"}`}>
              ✨ LuxuryBandit images<br /><span className="text-[10px] font-bold opacity-70">Use our AI faces</span>
            </button>
          </div>
          <p className="mt-1.5 text-[10px] font-bold text-ink/30">To protect everyone, an influencer can only use YOUR verified photos or our images — never someone else&apos;s face.</p>
        </div>

        {imageSource === "ours" && (
          <div className="mt-5 rounded-2xl border border-[#c9a23f]/30 bg-[#c9a23f]/[0.06] p-4">
            <span className={label}>Pick your face</span>
            <p className="mt-0.5 text-[11px] font-bold text-ink/45">Each face is <b>unique</b> — once booked it&apos;s gone. Free faces are <b>$3.99</b> to claim. We add new ones all the time.</p>
            {avatarFaces.length === 0 ? (
              <p className="mt-2 text-[12px] font-bold text-[#e7c877]">No free faces right now — new ones drop regularly. Pick “My own photos” above, or check back soon.</p>
            ) : (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {avatarFaces.map(f => (
                  <button key={f.id} type="button" disabled={f.claimed}
                    onClick={() => setAvatarFaceId(id => id === f.id ? "" : f.id)}
                    className={`relative aspect-square overflow-hidden rounded-xl border-2 transition ${f.claimed ? "cursor-not-allowed border-black/10 opacity-40" : avatarFaceId === f.id ? "border-amber-400" : "border-black/10"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                    <span className={`absolute bottom-1 left-1 rounded-full px-1.5 py-0.5 text-[9px] font-black ${f.claimed ? "bg-black/70 text-ink/60" : "bg-emerald-500 text-ink"}`}>{f.claimed ? "Booked" : "Free · $3.99"}</span>
                    {avatarFaceId === f.id && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-[11px] font-black text-black">✓</span>}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-2 text-[10px] font-bold text-ink/30">Uploading your own photos below is optional when you use our face.</p>
          </div>
        )}

        {/* Profile photos — one main + up to 3 more; the team picks the best one. */}
        <div className="mt-5 flex flex-col items-center gap-2">
          <span className={`${label} text-center`}>Profile photo{` `}· main</span>
          {(() => {
            const combined = [...profilePhotos.map(src => ({ src, isNew: true })), ...profileExisting.map(src => ({ src, isNew: false }))].slice(0, 4);
            const remove = (p: { src: string; isNew: boolean }) => { if (p.isNew) setProfilePhotos(prev => prev.filter(s => s !== p.src)); else setProfileExisting(prev => prev.filter(s => s !== p.src)); };
            const slot = (item: { src: string; isNew: boolean } | undefined, sizeCls: string, isMain: boolean) => item ? (
              <div className="relative">
                {/* Tap the photo itself to change it (opens the picker); the × removes it. */}
                <button type="button" onClick={() => profileFileRef.current?.click()} title="Tap to change this photo" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.src} alt="" className={`${sizeCls} rounded-2xl object-cover object-top`} />
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); remove(item); }}
                  className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black text-ink ring-1 ring-white/25">×</button>
                {isMain && <span className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-px text-[8px] font-black uppercase tracking-wide text-black">Main</span>}
              </div>
            ) : (
              <button type="button" onClick={() => profileFileRef.current?.click()}
                className={`${sizeCls} relative grid place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-amber-400/40 bg-black/[0.04] active:scale-95 transition-transform`}>
                {isMain && combined.length === 0 ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/apply-example-face.jpg" alt="" className="h-full w-full object-cover object-top opacity-40" />
                    <span className="absolute inset-0 grid place-items-center"><Camera className="h-6 w-6 text-ink drop-shadow" /></span>
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-ink">Example</span>
                  </>
                ) : (
                  <span className="grid place-items-center gap-0.5 text-amber-400"><Camera className={isMain ? "h-7 w-7" : "h-5 w-5"} /><span className="text-[8px] font-black">Add</span></span>
                )}
              </button>
            );
            return (
              <div className="flex flex-col items-center gap-2.5">
                {slot(combined[0], "h-36 w-36", true)}
              </div>
            );
          })()}
          <p className="max-w-xs text-center text-[11px] font-bold text-ink/40">One clear, well-lit face photo — this is you.</p>
          <input ref={profileFileRef} type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" className="hidden"
            onChange={e => { void onPickProfile(e.target.files?.[0]); e.target.value = ""; }} />
          {photoError && <p className="max-w-xs text-center text-xs font-bold text-red-400">{photoError}</p>}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" className="hidden"
            onChange={e => { void onPickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
          {/* One photo only at signup. The full-body / face-crop step lives at TRY-ON time. */}
        </div>

        {/* Identity */}
        <div className="mt-5 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><span className={label}>First name</span><input className={field} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Maria" /></div>
            <div><span className={label}>Last name</span><input className={field} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Popescu" /></div>
          </div>
          <div><span className={label}>Email</span><input type="email" className={field} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" /></div>
          <div>
            <span className={label}>WhatsApp 🔒</span>
            <input type="tel" className={field} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+40 7xx… (WhatsApp)" />
            <p className="mt-1.5 text-[11px] font-bold leading-relaxed text-ink/45">
              Never shown publicly — only our team sees it. We use it to notify you about fan
              chats &amp; try-ons and to verify you&rsquo;re a real person.{" "}
              <a href="/model-rules" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline underline-offset-2">See the rules</a>.
            </p>
          </div>
          <div><span className={label}>Instagram</span><input className={field} value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@handle" /></div>
          <div><span className={label}>Address</span><input className={field} value={address} onChange={e => setAddress(e.target.value)} placeholder="City, country" /></div>
        </div>

        {/* Taste */}
        <div className="mt-6">
          <p className="text-sm font-black text-ink">Your taste</p>
          <p className="mt-0.5 text-xs font-medium text-ink/50">AI uses this to suggest your motto & bio.</p>
          {/* Kept SHORT on purpose: just brands + a rough free-text — the AI hint
              replaces the old style/colors/fabrics/occasions/price/fit battery.
              (States remain so edit-mode preserves existing models' data.) */}
          <div className="mt-3 grid gap-4">
            <TagField dark label="Brands you love" list={db.brands} value={brandChips} onChange={setBrandChips} placeholder="Start typing… Zimmermann, Gucci…" />
          </div>

          <div className="mt-4">
            <span className={label}>Tell the AI roughly what you&apos;re about (optional)</span>
            <textarea className={`${field} h-auto py-3 leading-5`} rows={2} value={aiHint} onChange={e => setAiHint(e.target.value)}
              placeholder="e.g. beach girl, loves gold & silk, dreams of Dubai…" />
          </div>

          <button type="button" onClick={() => void suggest()} disabled={suggesting}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/[0.08] text-sm font-black text-amber-400 disabled:opacity-50 active:scale-95 transition-transform">
            {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {suggesting ? "Thinking…" : "Write my motto & bio with AI"}
          </button>
        </div>

        {/* Motto + bio */}
        <div className="mt-5 grid gap-3">
          <div>
            <span className={label}>Motto</span>
            <input className={field} value={motto} onChange={e => setMotto(e.target.value)} placeholder="Bandit the look!" />
            {mottoIdeas.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {mottoIdeas.map((m, i) => (
                  <button key={i} type="button" onClick={() => setMotto(m)}
                    className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-black transition ${motto === m ? "border-amber-400 bg-amber-400 text-black" : "border-black/15 bg-black/[0.04] text-ink/70"}`}>
                    {motto === m && <Check className="h-3 w-3" />}{m}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <span className={label}>Short bio</span>
            <textarea className={`${field} h-auto py-3 leading-5`} rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="One line about your eye for fashion…" />
          </div>
        </div>

        {/* Consent — required. She confirms she's real + accepts the rules (T&C). */}
        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-black/12 bg-black/[0.03] p-4">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-amber-400" />
          <span className="text-[12px] font-bold leading-relaxed text-ink/70">
            I&apos;m <b className="text-ink">18 or older</b>, the photos are <b className="text-ink">really me</b>, and I accept the{" "}
            <a href="/model-rules" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline underline-offset-2">model rules &amp; terms</a>.
            I understand every application is <b className="text-ink">manually verified</b> — fake or stolen photos are rejected.
          </span>
        </label>

        {error && <p className="mt-4 text-center text-xs font-bold text-red-400">{error}</p>}
      </div>

      {/* Submit */}
      <div className="lb-phone-col fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-[#faf7f0]/95 px-5 pt-3 backdrop-blur"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
        <button type="button" onClick={() => void submit()} disabled={submitting || (!editId && !agreed)}
          className="lb-gold flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-black disabled:opacity-50 active:scale-95 transition-transform">
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Coins className="h-5 w-5" />}
          {submitting ? (editId ? "Saving…" : "Setting up…") : (editId ? "Save changes" : "Sign up & start earning")}
        </button>
        <p className="mt-1.5 text-center text-[10px] font-bold text-ink/35">
          {editId ? "Changes go live immediately" : <>Start with free credits · earn more from likes &amp; try-ons</>}
        </p>
      </div>

      {cropSrc && (
        <PhotoCropper src={cropSrc} onCancel={() => setCropSrc("")}
          onDone={(dataUrl) => { setPhoto(dataUrl); setPhotoFull(cropSrc); setCropSrc(""); }} />
      )}
      {bodyCropSrc && (
        <PhotoCropper src={bodyCropSrc} aspect="portrait" onCancel={() => setBodyCropSrc("")}
          onDone={(dataUrl) => { setBodyPhotos([dataUrl]); setBodyCropSrc(""); }} />
      )}
      {profileCropSrc && (
        <PhotoCropper src={profileCropSrc} onCancel={() => setProfileCropSrc("")}
          onDone={(dataUrl) => { setProfilePhotos(prev => [...prev, dataUrl].slice(0, 4)); setProfileCropSrc(""); }} />
      )}

      {/* Save confirmation — proves what was saved (shows the new photo) before leaving. */}
      {savedDone && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-emerald-400/30 bg-[#141210] p-6 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-ink text-2xl font-black">✓</span>
            <h3 className="mt-3 text-lg font-black text-ink">Saved!</h3>
            <p className="mt-1 text-[13px] font-bold text-ink/55">{savedDone.photo ? "The profile photo has been updated." : "Changes saved."}</p>
            {savedDone.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={savedDone.photo} alt="" className="mx-auto mt-4 h-40 w-32 rounded-2xl object-cover object-top ring-2 ring-emerald-400/40" />
            )}
            <button type="button" onClick={() => router.push("/admin?tab=curators")}
              className="lb-gold mt-5 w-full rounded-full px-5 py-3 text-sm font-black active:scale-95 transition">Back to models</button>
          </div>
        </div>
      )}
    </div>
  );
}
