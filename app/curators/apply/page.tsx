"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Sparkles, Loader2, Check, Coins } from "lucide-react";
import { TagField, PhotoCropper, readPhotoFile } from "../taste-form";
import { getStoredAuthSession, signInWithPassword, signUpWithPassword, signInWithOAuth, type SupabaseAuthSession } from "@/lib/supabase-auth-client";

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
  const [modelName, setModelName] = useState(""); // public stage / influencer name
  const [nameStatus, setNameStatus] = useState<"" | "checking" | "available" | "taken">("");
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
  const [imageSource, setImageSource] = useState<"own" | "ours">("ours"); // default to our AI faces (the "own an AI influencer" funnel); "own" = your own photos
  const [roleModels, setRoleModels] = useState<{ id: string; name: string; photoUrl?: string; style?: string }[]>([]);
  const [avatarFaces, setAvatarFaces] = useState<{ id: string; imageUrl: string; videoUrl?: string; claimed: boolean; sold?: boolean; createdAt?: string }[]>([]);
  const [outfitThumbs, setOutfitThumbs] = useState<string[]>([]); // small wardrobe preview on her card: 1 dress + 4 lingerie
  const [heroVideoOn, setHeroVideoOn] = useState(false); // play the selected face's video on the big card
  const [faceDialog, setFaceDialog] = useState<{ id: string; imageUrl: string; videoUrl?: string; claimed: boolean; sold?: boolean; createdAt?: string } | null>(null); // preview + take a face
  const [rulesOpen, setRulesOpen] = useState(false); // "You get one shot" rules → link under the photo opens this dialog
  const [avatarFaceId, setAvatarFaceId] = useState(""); // the FREE face this creator picks (booked on $9.99 payment)
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
      setRoleModels((d.models ?? []).filter((m: any) => m.photoUrl).slice(0, 40)
        .map((m: any) => ({ id: m.id, name: m.name, photoUrl: m.photoUrl, style: typeof m.style === "string" ? m.style : "" })));
    }).catch(() => {});
    // AI-face library (for the "our images" path).
    fetch("/api/try-this-look?avatarFaces=1").then(r => r.json()).then((d: any) => {
      setAvatarFaces(Array.isArray(d.faces) ? d.faces.filter((f: any) => !f.sold) : []); // sold faces are hidden
    }).catch(() => {});
    // Wardrobe preview for her card — 1 dress + 4 lingerie from our garment gallery.
    fetch("/api/try-this-look").then(r => r.json()).then((d: any) => {
      const looks = Array.isArray(d.looks) ? d.looks : [];
      const gar = looks.filter((l: any) => (l.productType === "ai" || l.wardrobe) && (l.frontImageUrl || l.imageUrl) && l.published !== false);
      const img = (l: any) => l.frontImageUrl || l.imageUrl || "";
      const lingerie = gar.filter((l: any) => l.category === "boudoir").map(img).filter(Boolean);
      const dresses = gar.filter((l: any) => l.category !== "boudoir").map(img).filter(Boolean);
      const picks = [...dresses.slice(0, 1), ...lingerie.slice(0, 4)];
      const rest = [...dresses.slice(1), ...lingerie.slice(4)];
      while (picks.length < 5 && rest.length) { const n = rest.shift(); if (n && !picks.includes(n)) picks.push(n); }
      setOutfitThumbs([...new Set(picks)].slice(0, 5));
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
  const [agreeError, setAgreeError] = useState(false); // turn the consent box red if they submit without ticking it
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");

  // ── Gate: you must have a REAL account before you can reach the application form.
  // Admin edit-mode (?edit=) skips the gate. Reuses the site's Supabase auth.
  const [authSession, setAuthSession] = useState<SupabaseAuthSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdminEdit, setIsAdminEdit] = useState(false);
  const [authTab, setAuthTab] = useState<"register" | "signin">("register");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authErr, setAuthErr] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  useEffect(() => {
    // Admins skip the sign-up wall: edit mode, or an admin PIN / the /admin-mirrored
    // path means it's staff (a password-admin already has a Supabase session anyway).
    const adminPin = (() => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin"); } catch { return null; } })();
    const isAdminCtx = !!adminPin || window.location.pathname.startsWith("/admin");
    if (new URLSearchParams(window.location.search).get("edit") || isAdminCtx) { setIsAdminEdit(true); setAuthReady(true); return; }
    const s = getStoredAuthSession();
    if (s) { setAuthSession(s); if (s.user?.email) setEmail(prev => prev || s.user?.email || ""); }
    setAuthReady(true);
  }, []);
  const doAuth = async () => {
    if (!email.trim() || authPassword.length < 6) { setAuthErr("Enter your email and a password (6+ characters)."); return; }
    setAuthErr(""); setAuthMsg(""); setAuthLoading(true);
    try {
      if (authTab === "signin") {
        setAuthSession(await signInWithPassword(email.trim(), authPassword));
      } else {
        const { session: s, confirmationRequired } = await signUpWithPassword(email.trim(), authPassword, firstName.trim() || undefined);
        if (s && !confirmationRequired) setAuthSession(s);
        else { setAuthMsg("Account created — check your email to confirm, then log in."); setAuthTab("signin"); }
      }
    } catch (e) { setAuthErr(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setAuthLoading(false); }
  };
  const oauth = (provider: "google") => {
    try { sessionStorage.setItem("lb_oauth_return", "/curators/apply"); } catch { /**/ }
    signInWithOAuth(provider, `${window.location.origin}/auth/confirm?returnTo=/curators/apply`);
  };
  const doForgot = async () => {
    if (!email.trim()) { setAuthErr("Enter your email above first, then tap “Forgot password”."); return; }
    setAuthErr(""); setAuthMsg(""); setAuthLoading(true);
    try {
      const res = await fetch("/api/send-reset-link", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), redirectTo: `${window.location.origin}/auth/reset-password` }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Could not send reset email.");
      if (d.skipped) setAuthErr("Email isn’t set up yet — please contact support to reset your password.");
      else setAuthMsg("If this email exists, you’ll get a reset link shortly.");
    } catch (e) { setAuthErr(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setAuthLoading(false); }
  };
  // Live "is this model name free?" check (debounced). Server enforces it too on submit.
  useEffect(() => {
    const n = modelName.trim();
    if (n.length < 2) { setNameStatus(""); return; }
    setNameStatus("checking");
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ checkName: n });
        const editParam = new URLSearchParams(window.location.search).get("edit") || "";
        if (editParam) params.set("excludeId", editParam);
        const r = await fetch(`/api/curator?${params.toString()}`);
        const d = await r.json();
        setNameStatus(d.available ? "available" : "taken");
      } catch { setNameStatus(""); }
    }, 450);
    return () => clearTimeout(t);
  }, [modelName]);

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
  // A face is "NEW" for its first 14 days.
  const isNewFace = (createdAt?: string) => { if (!createdAt) return false; const t = Date.parse(createdAt); return !!t && Date.now() - t < 14 * 24 * 60 * 60 * 1000; };
  // Admin: re-crop a pool face to 3:4 and replace it (uses the existing replace-avatar-face action).
  const [faceCropSrc, setFaceCropSrc] = useState("");
  const [faceCropId, setFaceCropId] = useState("");
  const [faceCropBusy, setFaceCropBusy] = useState(false);
  const reloadFaces = () => fetch("/api/try-this-look?avatarFaces=1").then(r => r.json()).then((d: any) => setAvatarFaces(Array.isArray(d.faces) ? d.faces.filter((f: any) => !f.sold) : [])).catch(() => {});
  const startFaceCrop = async (imageUrl: string, id: string) => {
    setFaceDialog(null); setFaceCropId(id); // close the dialog FIRST — no overlap with the cropper
    try {
      const blob = await (await fetch(imageUrl)).blob();
      const dataUrl = await new Promise<string>((resolve) => { const r = new FileReader(); r.onloadend = () => resolve(String(r.result)); r.readAsDataURL(blob); });
      setFaceCropSrc(dataUrl);
    } catch { setFaceCropId(""); }
  };
  const saveFaceCrop = async (dataUrl: string) => {
    if (!faceCropId) return;
    setFaceCropBusy(true);
    try {
      await fetch("/api/try-this-look", { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": getPin() }, body: JSON.stringify({ action: "replace-avatar-face", faceId: faceCropId, image: dataUrl }) });
    } catch { /**/ }
    setFaceCropSrc(""); setFaceCropId(""); await reloadFaces(); setFaceCropBusy(false);
  };
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
        setModelName(c.modelName ?? "");
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

  // ── Draft persistence ─────────────────────────────────────────────────────
  // The #1 drop-off killer: a user goes to Stripe, hits "back", and the whole
  // form is empty. So we keep every text/selection field in localStorage and
  // restore it on return/reload. Photos are intentionally excluded (base64
  // selfies would blow the ~5MB quota). Public signup only — never admin edit.
  const DRAFT_KEY = "lb-apply-draft-v1";
  const [draftReady, setDraftReady] = useState(false);
  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch { /**/ } };
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("edit")) return; // edit mode prefills from the server
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (d && typeof d === "object") {
        const s = (v: unknown) => (typeof v === "string" ? v : "");
        const arr = (v: unknown) => (Array.isArray(v) ? v.filter(x => typeof x === "string") as string[] : []);
        if (d.modelName) setModelName(s(d.modelName));
        if (d.firstName) setFirstName(s(d.firstName));
        if (d.lastName) setLastName(s(d.lastName));
        if (d.email) setEmail(s(d.email));
        if (d.phone) setPhone(s(d.phone));
        if (d.address) setAddress(s(d.address));
        if (d.instagram) setInstagram(s(d.instagram));
        if (d.brandChips) setBrandChips(arr(d.brandChips));
        if (d.styleChips) setStyleChips(arr(d.styleChips));
        if (d.colorChips) setColorChips(arr(d.colorChips));
        if (d.fabricChips) setFabricChips(arr(d.fabricChips));
        if (d.occasionChips) setOccasionChips(arr(d.occasionChips));
        if (d.genderFocus) setGenderFocus(s(d.genderFocus));
        if (d.priceTiers) setPriceTiers(arr(d.priceTiers));
        if (d.fitFocus) setFitFocus(arr(d.fitFocus));
        if (d.styleModelId) setStyleModelId(s(d.styleModelId));
        if (d.imageSource === "own" || d.imageSource === "ours") setImageSource(d.imageSource);
        if (d.avatarFaceId) setAvatarFaceId(s(d.avatarFaceId));
        if (d.motto) setMotto(s(d.motto));
        if (d.bio) setBio(s(d.bio));
        if (d.aiHint) setAiHint(s(d.aiHint));
        if (d.agreed) setAgreed(true);
      }
    } catch { /**/ }
    setDraftReady(true); // start persisting from here (gates the save effect below)
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!draftReady) return; // don't clobber the stored draft before we've restored it
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        modelName, firstName, lastName, email, phone, address, instagram,
        brandChips, styleChips, colorChips, fabricChips, occasionChips,
        genderFocus, priceTiers, fitFocus, styleModelId, imageSource, avatarFaceId,
        motto, bio, aiHint, agreed,
      }));
    } catch { /* quota / private mode — persistence is best-effort */ }
  }, [draftReady, modelName, firstName, lastName, email, phone, address, instagram, brandChips, styleChips, colorChips, fabricChips, occasionChips, genderFocus, priceTiers, fitFocus, styleModelId, imageSource, avatarFaceId, motto, bio, aiHint, agreed]);

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
    setAgreeError(!agreed); // any submit attempt reflects the consent state (red box if unticked)
    if (!modelName.trim() || !firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("Model name, first name, last name and email are required."); return;
    }
    if (nameStatus === "taken") { setError("That model name is taken — please choose another."); return; }
    if (!agreed) { setError("Please confirm you're 18+, the photos are really you, and you accept the Terms & Conditions."); return; }
    setError(""); setSubmitting(true);
    try {
      const shared = {
        modelName, firstName, lastName, email, phone, address, instagram, brands, style, motto, bio,
        genderFocus, styleModelId, imageSource, ...(imageSource === "ours" && avatarFaceId ? { avatarFaceId } : {}), consent: agreed, consentText: "18+, photos are really me, accept the Terms & Conditions",
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
      // One package purchase at the end: start the $8-first-month subscription now.
      // The auto first-month coupon is applied for EVERYONE (incl. admins) so the checkout
      // always shows "$8 first month" — that's the buy trigger. (No promo-code field then.)
      // TESTING: /curators/apply?promo=1 skips the auto-coupon so the Stripe promo-code field
      // shows → enter a 100% code to test the subscription free. Normal flow is unchanged.
      const allowPromo = (() => { try { return new URLSearchParams(window.location.search).get("promo") === "1"; } catch { return false; } })();
      try {
        const pr = await fetch("/api/premium", {
          method: "POST", headers: { "Content-Type": "application/json" },
          // Success → landing (confirmation). Back/cancel → THIS form, so the session isn't lost.
          body: JSON.stringify({ email: email.trim(), returnPath: "/own-influencer", cancelPath: window.location.pathname, ...(allowPromo ? { allowPromo: true } : {}) }),
        }).then(x => x.json()).catch(() => null);
        // Keep the draft through the Stripe round-trip: if the user hits "back"/cancel
        // they return to this form and the draft repopulates it. Cleared only on success.
        if (pr?.url) { window.location.href = pr.url as string; return; }
      } catch { /**/ }
      clearDraft();
      setApplied(true); // Stripe not available → show the application-received screen instead
    } catch {
      setError("Could not submit.");
    } finally {
      setSubmitting(false);
    }
  };

  // $9.99 to lock the chosen unique AI face — Stripe popup + poll, then it's booked to her.
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
  const field = "h-12 w-full rounded-xl border-[1.5px] border-slate-400 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-slate-700 placeholder:text-slate-500";
  const label = "mb-1 block text-[13px] font-black uppercase tracking-wider text-slate-900";
  // 3D press-able button shadows (dark primary + light raised) — reused across the form.
  const btn3d = "shadow-[0_3px_0_#0f172a,0_6px_14px_rgba(15,23,42,0.28)] transition-all active:translate-y-[3px] active:shadow-[0_1px_0_#0f172a]";
  const raise = "shadow-[0_2px_0_rgba(15,23,42,0.22),0_5px_12px_rgba(15,23,42,0.10)] transition-all active:translate-y-[2px] active:shadow-[0_0_0_rgba(0,0,0,0)]";

  // Wait for the auth check, then gate: no real account → sign-up wall (banner stays).
  if (!authReady) return <div className="min-h-screen bg-[#faf7f0]" />;
  if (!authSession && !isAdminEdit) {
    return (
      <div className="min-h-screen bg-[#faf7f0] text-slate-900">
        {/* The VISUAL comes first — full-bleed banner at the very top, back button floats over it. */}
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/become-a-model-banner.jpg?v=3" alt="Become or create your own LuxuryBandit Influencer and make money daily"
            className="block w-full" />
          <button type="button" onClick={() => router.back()}
            className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur active:scale-90 transition-transform">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="mx-auto w-full max-w-md px-5 pb-20">
          <h1 className="mt-5 text-center text-2xl font-black leading-tight">Create your account to apply</h1>
          <p className="mx-auto mt-2 max-w-sm text-center text-[14px] font-bold text-slate-600">
            A real account — this is where your <b className="text-slate-900">earnings, videos and fan chats</b> live. It only takes a moment.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-black/[0.04] p-1">
            {(["register", "signin"] as const).map(t => (
              <button key={t} type="button" onClick={() => { setAuthTab(t); setAuthErr(""); setAuthMsg(""); }}
                className={`h-10 rounded-lg text-sm font-black transition ${authTab === t ? "bg-slate-800 text-white" : "text-slate-600"}`}>
                {t === "register" ? "Sign up" : "Log in"}
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-2.5">
            <input type="email" autoComplete="email" className={field} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
            <input type="password" autoComplete={authTab === "register" ? "new-password" : "current-password"} className={field}
              value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Password (6+ characters)"
              onKeyDown={e => { if (e.key === "Enter") void doAuth(); }} />
            {authErr && <p className="text-[13px] font-bold text-red-500">{authErr}</p>}
            {authMsg && <p className="text-[13px] font-bold text-emerald-600">{authMsg}</p>}
            <button type="button" onClick={() => void doAuth()} disabled={authLoading}
              className={`bg-slate-800 text-white flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black disabled:opacity-50 ${btn3d}`}>
              {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (authTab === "register" ? "Sign up & continue" : "Log in & continue")}
            </button>
            {authTab === "signin" && (
              <button type="button" onClick={() => void doForgot()} disabled={authLoading}
                className="mx-auto text-[13px] font-black text-slate-600 underline underline-offset-2 active:opacity-70 disabled:opacity-50">
                Forgot password?
              </button>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3 text-[12px] font-bold text-slate-500">
            <span className="h-px flex-1 bg-black/10" /> or <span className="h-px flex-1 bg-black/10" />
          </div>
          <button type="button" onClick={() => oauth("google")}
            className={`mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-slate-400 bg-white text-sm font-black text-slate-900 ${raise}`}>
            Continue with Google
          </button>
          <p className="mx-auto mt-4 max-w-xs text-center text-[12px] font-bold text-slate-500">
            Your details stay private — we only use them to run your influencer account.
          </p>
        </div>
      </div>
    );
  }

  if (applied) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#faf7f0] px-6 text-center text-slate-900">
        <div className="max-w-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-800 text-2xl text-white">✓</div>
          <h1 className="mt-4 text-xl font-black text-slate-900">Application received{firstName ? `, ${firstName}` : ""}!</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
            Our team reviews every LuxuryBandit Influencer personally. You&apos;ll get an email as soon
            as you&apos;re approved — then just sign in and start earning.
          </p>
          <button type="button" onClick={() => router.push("/stores")}
            className={`bg-slate-800 text-white mt-5 inline-flex h-12 items-center justify-center rounded-2xl px-6 text-sm font-black ${btn3d}`}>
            Back to LuxuryBandit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#faf7f0] text-slate-900" style={{ paddingBottom: "calc(130px + env(safe-area-inset-bottom))" }}>
      {editId ? (
        /* Edit mode (admin) — plain sticky nav header. */
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/22 bg-[#faf7f0]/95 px-4 py-3 backdrop-blur">
          <button type="button" onClick={cancel}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/15 text-slate-900 active:scale-90 transition-transform">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <p className="flex-1 text-sm font-black text-slate-900">Edit model{firstName ? ` — ${firstName}` : ""}</p>
          <button type="button" onClick={cancel}
            className="shrink-0 rounded-full border border-black/15 px-4 py-2 text-sm font-black text-slate-800 active:scale-95 transition-transform">
            Cancel
          </button>
        </div>
      ) : (
        /* Applicant — the VISUAL comes first: full-bleed banner at the very top, nav floats over it. */
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/become-a-model-banner.jpg?v=3" alt="Become or create your own LuxuryBandit Influencer and make money daily"
            className="block w-full" />
          <button type="button" onClick={cancel}
            className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur active:scale-90 transition-transform">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={cancel}
            className="absolute right-3 top-3 rounded-full bg-black/45 px-4 py-1.5 text-sm font-black text-white backdrop-blur active:scale-95 transition-transform">
            Cancel
          </button>
        </div>
      )}

      <div className="px-5 pt-6">
        {/* Header for the applicant flow (replaces the old welcome copy). */}
        {!editId && <div className="text-center">
          <h1 className="text-[26px] font-black leading-tight text-slate-900">Create your influencer profile</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-700">
            Three quick steps — <b className="text-slate-900">1.</b> your face &amp; photo, <b className="text-slate-900">2.</b> your style, <b className="text-slate-900">3.</b> your details. About two minutes.
          </p>
        </div>}


        {/* Big influencer profile card — the selected face shown exactly as her public
            profile will look (name, motto, stats, Follow/Message). Updates live as she's
            picked from the gallery below. */}
        {!editId && (() => {
          const sel = avatarFaces.find(f => f.id === avatarFaceId && !f.claimed);
          const firstFree = avatarFaces.find(f => !f.claimed);
          const gina = roleModels.find(m => /gina/i.test(m.name || "") && m.photoUrl);
          const heroSrc = imageSource === "own"
            ? (photo || profileExisting[0] || gina?.photoUrl || firstFree?.imageUrl || "")
            : (sel?.imageUrl || firstFree?.imageUrl || gina?.photoUrl || "");
          if (!heroSrc) return null;
          const heroVideo = imageSource === "own" ? "" : (sel?.videoUrl || firstFree?.videoUrl || "");
          const nm = modelName.trim() || "Your influencer";
          const tag = motto.trim() || "Your vibe, every day 💛";
          return (
            <div className="mt-5">
              <div className="mx-auto max-w-[340px] overflow-hidden rounded-3xl bg-[#0d0b0a] text-white shadow-[0_16px_50px_rgba(0,0,0,0.3)]">
                <div className="relative aspect-[4/5] w-full">
                  {heroVideoOn && heroVideo ? (
                    /* eslint-disable-next-line jsx-a11y/media-has-caption */
                    <video src={heroVideo} autoPlay muted playsInline controls className="h-full w-full bg-black object-cover" />
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={heroSrc} alt={nm} className="h-full w-full object-cover" />
                      {heroVideo && (
                        <button type="button" onClick={() => setHeroVideoOn(true)} aria-label="Play video"
                          className="absolute inset-0 grid place-items-center">
                          <span className="grid h-16 w-16 place-items-center rounded-full bg-black/45 text-white ring-1 ring-white/50 backdrop-blur transition active:scale-95">
                            <svg viewBox="0 0 24 24" className="h-7 w-7 translate-x-0.5 fill-current"><path d="M8 5v14l11-7z" /></svg>
                          </span>
                        </button>
                      )}
                    </>
                  )}
                  {!heroVideoOn && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 pt-10">
                    <p className="text-[20px] font-black leading-none">{nm}</p>
                    <p className="mt-1 text-[13px] font-bold text-amber-400">{tag}</p>
                    {outfitThumbs.length > 0 && (
                      <div className="mt-2.5 flex gap-1.5">
                        {outfitThumbs.map((src, i) => (
                          <div key={i} className="h-11 w-9 shrink-0 overflow-hidden rounded-md bg-white/10 ring-1 ring-white/40">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1 px-3 py-3 text-center">
                  {[["Looks", "24"], ["Followers", "345k"], ["Likes", "1.2M"], ["Views", "4.8M"]].map(([l, v]) => (
                    <div key={l}><p className="text-[16px] font-black">{v}</p><p className="text-[9px] font-bold uppercase tracking-wide text-white/45">{l}</p></div>
                  ))}
                </div>
                <div className="flex gap-2 px-3 pb-4">
                  <span className="flex-1 rounded-full bg-white py-2 text-center text-[13px] font-black text-black">Follow</span>
                  <span className="flex-1 rounded-full bg-white/12 py-2 text-center text-[13px] font-black">Chat with me!</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Gallery — your own photo (upload + crop) + our AI faces, directly under the big card. */}
        <div className="mt-4 flex snap-x gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Your own photo — same tile as the faces, with upload + crop built in. */}
          <button type="button" onClick={() => { setImageSource("own"); fileRef.current?.click(); }}
            className={`relative aspect-[3/4] w-[30%] shrink-0 snap-start overflow-hidden rounded-xl border-2 bg-black/[0.04] transition ${imageSource === "own" ? "border-slate-800" : "border-dashed border-black/30"}`}>
            {imageSource === "own" && photo ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="" className="h-full w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[9px] font-black uppercase tracking-wide text-white">Tap to re-crop</span>
                <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-slate-800 text-[13px] font-black text-white">✓</span>
              </>
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-center text-slate-600">
                <span className="text-[20px]">📸</span>
                <span className="text-[10px] font-black uppercase leading-tight">Your own photo</span>
                <span className="text-[8px] font-bold text-slate-400">upload + crop</span>
              </span>
            )}
          </button>
          {avatarFaces.map(f => (
            <button key={f.id} type="button" disabled={f.claimed}
              onClick={() => setFaceDialog(f)}
              className={`relative aspect-[3/4] w-[30%] shrink-0 snap-start overflow-hidden rounded-xl border-2 bg-black/[0.04] transition ${f.claimed ? "cursor-not-allowed border-black/22 opacity-40" : imageSource === "ours" && avatarFaceId === f.id ? "border-slate-800" : "border-black/22"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.imageUrl} alt="" loading="lazy" className="h-full w-full object-contain" />
              {f.claimed && <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[11px] font-black text-white/70">Booked</span>}
              {f.videoUrl && !f.claimed && <span className="pointer-events-none absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[11px] text-white">▶</span>}
              {isNewFace(f.createdAt) && !f.claimed && !(imageSource === "ours" && avatarFaceId === f.id) && <span className="pointer-events-none absolute right-1 top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white shadow">New</span>}
              {imageSource === "ours" && avatarFaceId === f.id && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-slate-800 text-[13px] font-black text-white">✓</span>}
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-2xl border border-black/15 bg-black/[0.04] p-4">
          <span className={label}>Pick your influencer</span>
          <p className="mt-0.5 text-[13px] font-bold text-slate-600">Tap a <b>one-of-a-kind</b> AI face above — or the first tile to use <b>your own photo</b>. We add new faces all the time.</p>
          {avatarFaces.length > 0 && (
            <div className="mt-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 px-4 py-2.5 text-center shadow-[0_6px_20px_rgba(220,38,38,0.45)]">
              <p className="text-[15px] font-black uppercase leading-none tracking-tight text-white drop-shadow">🔥 Grab yours before she&apos;s gone!</p>
              <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-white/90">Each face = only ONE owner, ever</p>
            </div>
          )}
          <p className="mt-2 text-[11px] font-bold text-slate-500">To protect everyone, an influencer can only use YOUR verified photo or our AI images — never someone else&apos;s face.</p>
        </div>

        {/* What you get after you sign up. */}
        <div className="mt-5 rounded-2xl border border-black/12 bg-white p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">After you sign up</p>
          <h3 className="mt-0.5 text-[16px] font-black text-slate-900">What you get</h3>
          <ul className="mt-2.5 space-y-1.5 text-[13px] font-bold text-slate-700">
            <li className="flex gap-2"><span>💎</span> We create her luxury content — fresh photos &amp; videos, every day.</li>
            <li className="flex gap-2"><span>📱</span> She gets her own public profile — like the card above.</li>
            <li className="flex gap-2"><span>💬</span> Chat with her yourself — and her fans discover, follow &amp; chat with her too.</li>
            <li className="flex gap-2"><span>🎬</span> When anyone does a try-on with her, you earn <b>30% back in credits</b>.</li>
            <li className="flex gap-2"><span>💬</span> Fans get 10 free messages, then pay <b>$3.99 for 30 min</b> to chat with her — you earn from it.</li>
          </ul>
        </div>

        {/* Own photo + face selection now live in the gallery under the big card. Keep only the
            rules link + the hidden file inputs the gallery's "your own photo" tile triggers. */}
        <div className="mt-4 flex flex-col items-center gap-2">
          <button type="button" onClick={() => setRulesOpen(true)}
            className="text-[13px] font-black text-slate-700 underline underline-offset-2 active:opacity-70">
            ⚠️ You get one shot — read the rules &amp; how it works
          </button>
          <input ref={profileFileRef} type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" className="hidden"
            onChange={e => { void onPickProfile(e.target.files?.[0]); e.target.value = ""; }} />
          {photoError && <p className="max-w-xs text-center text-sm font-bold text-red-400">{photoError}</p>}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" className="hidden"
            onChange={e => { void onPickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
          {/* One photo only at signup. The full-body / face-crop step lives at TRY-ON time. */}
        </div>

        {/* Copy a style — STYLE TITLES only (no model faces — those confused people into
            thinking they were picking a person). Each style maps to a template model. */}
        <div className="mt-5 rounded-2xl border border-black/22 bg-black/[0.03] p-4">
          <span className={label}>Copy a style you love</span>
          <p className="mt-0.5 text-[13px] font-bold text-slate-600">Pick the <b className="text-slate-900">style</b> you want us to dress you in — always on your own face, never a copy of a person.</p>
          {(() => {
            const seen = new Set<string>();
            const styleOptions: { style: string; modelId: string }[] = [];
            for (const m of roleModels) {
              const s = (m.style || "").split(",")[0].trim();
              if (!s) continue;
              const k = s.toLowerCase();
              if (seen.has(k)) continue;
              seen.add(k); styleOptions.push({ style: s, modelId: m.id });
            }
            const selM = roleModels.find(x => x.id === styleModelId);
            const selStyle = (selM?.style || "").split(",")[0].trim().toLowerCase();
            return (
              <>
                <div className="mt-2 flex flex-wrap gap-2">
                  {styleOptions.map(opt => {
                    const sel = !!selStyle && opt.style.toLowerCase() === selStyle;
                    return (
                      <button key={opt.modelId} type="button" onClick={() => setStyleModelId(id => id === opt.modelId ? "" : opt.modelId)}
                        className={`rounded-full border px-3.5 py-2 text-sm font-black transition ${sel ? "border-slate-800 bg-slate-800 text-white" : "border-slate-400 bg-white text-slate-800"}`}>
                        {opt.style}
                      </button>
                    );
                  })}
                </div>
                {selStyle && (
                  <p className="mt-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[12px] font-bold text-slate-700">
                    ✓ We&apos;ll dress you in a <b className="text-slate-900">{selStyle} style</b> — always on your own face. Your look stays yours.
                  </p>
                )}
              </>
            );
          })()}
        </div>

        {/* Identity */}
        <div className="mt-5 grid gap-3">
          <div>
            <span className={label}>Your model name</span>
            <div className="relative">
              <input className={`${field} ${nameStatus === "taken" ? "ring-2 ring-red-400" : nameStatus === "available" ? "ring-2 ring-emerald-500" : ""}`}
                value={modelName} onChange={e => setModelName(e.target.value)} placeholder="e.g. Bella Rose — your public influencer name" />
              {nameStatus === "checking" && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
              {nameStatus === "available" && <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />}
            </div>
            {nameStatus === "taken"
              ? <p className="mt-1 text-[12px] font-bold text-red-500">That name is taken — please choose another.</p>
              : nameStatus === "available"
                ? <p className="mt-1 text-[12px] font-bold text-emerald-600">✓ Available — this name is yours.</p>
                : <p className="mt-1 text-[12px] font-bold text-slate-600">This is the name fans see. Your real name below stays private.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><span className={label}>First name</span><input className={field} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Maria" /></div>
            <div><span className={label}>Last name</span><input className={field} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Popescu" /></div>
          </div>
          <div><span className={label}>Email</span><input type="email" className={field} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" /></div>
          <div>
            <span className={label}>WhatsApp 🔒 <span className="font-bold normal-case text-slate-400">· optional</span></span>
            <input type="tel" className={field} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+40 7xx… (WhatsApp)" />
            <p className="mt-1.5 text-[13px] font-bold leading-relaxed text-slate-600">
              Never shown publicly — only our team sees it. We use it to notify you about fan
              chats &amp; try-ons and to verify you&rsquo;re a real person.{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-slate-900 underline underline-offset-2">See our terms</a>.
            </p>
          </div>
          <div><span className={label}>Instagram <span className="font-bold normal-case text-slate-400">· optional</span></span><input className={field} value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@handle" /></div>
          <div><span className={label}>Address <span className="font-bold normal-case text-slate-400">· optional</span></span><input className={field} value={address} onChange={e => setAddress(e.target.value)} placeholder="City, country" /></div>
        </div>

        {/* Taste */}
        <div className="mt-6">
          <p className="text-sm font-black text-slate-900">Your taste</p>
          <p className="mt-0.5 text-sm font-medium text-slate-700">AI uses this to suggest your motto & bio.</p>
          {/* Kept SHORT on purpose: just brands + a rough free-text — the AI hint
              replaces the old style/colors/fabrics/occasions/price/fit battery.
              (States remain so edit-mode preserves existing models' data.) */}
          <div className="mt-3 grid gap-4">
            <TagField label="Brands you love" list={db.brands} value={brandChips} onChange={setBrandChips} placeholder="Start typing… Zimmermann, Gucci…" />
          </div>

          <div className="mt-4">
            <span className={label}>Tell the AI roughly what you&apos;re about (optional)</span>
            <textarea className={`${field} h-auto py-3 leading-5`} rows={2} value={aiHint} onChange={e => setAiHint(e.target.value)}
              placeholder="e.g. beach girl, loves gold & silk, dreams of Dubai…" />
          </div>

          <button type="button" onClick={() => void suggest()} disabled={suggesting}
            className={`mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-slate-400 bg-white text-sm font-black text-slate-900 disabled:opacity-50 ${raise}`}>
            {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {suggesting ? "Thinking…" : "Write my motto & bio with AI"}
          </button>
        </div>

        {/* Motto + bio */}
        <div className="mt-5 grid gap-3">
          <div>
            <span className={label}>Motto <span className="font-bold normal-case text-slate-400">· optional</span></span>
            <input className={field} value={motto} onChange={e => setMotto(e.target.value)} placeholder="Bandit the look!" />
            {mottoIdeas.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {mottoIdeas.map((m, i) => (
                  <button key={i} type="button" onClick={() => setMotto(m)}
                    className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-black transition ${motto === m ? "border-slate-800 bg-slate-800 text-white" : "border-black/15 bg-black/[0.04] text-slate-800"}`}>
                    {motto === m && <Check className="h-3 w-3" />}{m}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <span className={label}>Short bio <span className="font-bold normal-case text-slate-400">· optional</span></span>
            <textarea className={`${field} h-auto py-3 leading-5`} rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="One line about your eye for fashion…" />
          </div>
        </div>

        {/* Consent — required. She confirms she's real + accepts the rules (T&C). */}
        <label className={`mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${agreeError && !agreed ? "border-red-500 bg-red-50 ring-2 ring-red-500/25" : "border-black/25 bg-black/[0.03]"}`}>
          <input type="checkbox" checked={agreed} onChange={e => { setAgreed(e.target.checked); if (e.target.checked) setAgreeError(false); }}
            className={`mt-0.5 h-5 w-5 shrink-0 accent-amber-400 ${agreeError && !agreed ? "outline outline-2 outline-red-500" : ""}`} />
          <span className="text-[14px] font-bold leading-relaxed text-slate-800">
            I&apos;m <b className="text-slate-900">18 or older</b>, the photos are <b className="text-slate-900">really me</b>, and I accept the{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-slate-900 underline underline-offset-2">Terms &amp; Conditions</a>.
            I understand every application is <b className="text-slate-900">manually verified</b> — fake or stolen photos are rejected.
          </span>
        </label>

        {error && <p className="mt-4 text-center text-sm font-bold text-red-400">{error}</p>}
      </div>

      {/* Submit */}
      <div className="lb-phone-col fixed inset-x-0 bottom-0 z-20 border-t border-black/22 bg-[#faf7f0]/95 px-5 pt-3 backdrop-blur"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
        <button type="button" onClick={() => void submit()} disabled={submitting}
          className={`bg-slate-800 text-white flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-black disabled:opacity-50 ${btn3d}`}>
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Coins className="h-5 w-5" />}
          {submitting ? (editId ? "Saving…" : "Setting up…") : (editId ? "Save changes" : "Sign up & start earning")}
        </button>
        <p className="mt-1.5 text-center text-[12px] font-bold text-slate-600">
          {editId ? "Changes go live immediately" : <>First month <b className="text-slate-900">$8</b>, then $49/mo · cancel anytime · 🔒 secure Stripe checkout</>}
        </p>
      </div>

      {cropSrc && (
        <PhotoCropper src={cropSrc} aspect="portrait" onCancel={() => setCropSrc("")}
          onDone={(dataUrl) => { setPhoto(dataUrl); setPhotoFull(cropSrc); setCropSrc(""); }} />
      )}
      {/* Admin: re-crop a pool face → replace it (3:4). */}
      {faceCropSrc && (
        <PhotoCropper src={faceCropSrc} aspect="portrait" onCancel={() => { setFaceCropSrc(""); setFaceCropId(""); }}
          onDone={(dataUrl) => void saveFaceCrop(dataUrl)} />
      )}
      {bodyCropSrc && (
        <PhotoCropper src={bodyCropSrc} aspect="portrait" onCancel={() => setBodyCropSrc("")}
          onDone={(dataUrl) => { setBodyPhotos([dataUrl]); setBodyCropSrc(""); }} />
      )}
      {profileCropSrc && (
        <PhotoCropper src={profileCropSrc} aspect="portrait" onCancel={() => setProfileCropSrc("")}
          onDone={(dataUrl) => { setProfilePhotos(prev => [...prev, dataUrl].slice(0, 4)); setProfileCropSrc(""); }} />
      )}

      {/* "You get one shot" rules — opened from the link under the photo. */}
      {rulesOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={e => { if (e.target === e.currentTarget) setRulesOpen(false); }}>
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-[#faf7f0] p-5 text-center">
            <p className="text-[16px] font-black text-slate-900">⚠️ You get one shot — send your very best photos.</p>
            <p className="mt-2 text-[13px] font-bold leading-relaxed text-slate-700">Photos that are blurry, hide your face (hat/sunglasses), fake, or don&apos;t fit our luxury concept are rejected — and a rejected application can&apos;t apply again. Sharp, well-lit, real photos only.</p>
            <p className="mt-3 text-[13px] font-bold leading-relaxed text-slate-900">💰 You earn <b>30%</b> (~$1.20) every time a fan makes a paid video with you — it lands in your account automatically. The more fans pick you, the more you earn. <a href="/earnings" className="underline underline-offset-2">How earnings work →</a></p>
            <p className="mt-2 text-[13px] font-bold leading-relaxed text-slate-900">🎬 Turn your photos into stunning videos once you&apos;re approved — just $3.99 per video. Serious creators only.</p>
            <p className="mt-2 text-[13px] font-bold leading-relaxed text-slate-800">💡 <b className="text-slate-900">You&apos;re never on your own.</b> Every single day we hand you fresh <b className="text-slate-900">outfits and video ideas</b> — you just post. No ideas needed, we do the creative work.</p>
            <p className="mt-2 text-[13px] font-bold leading-relaxed text-slate-800">🤖 <b className="text-slate-900">A free AI chat assistant for your fans</b> — it chats with them for you, day and night. You have <b className="text-slate-900">zero work</b> with it.</p>
            <button type="button" onClick={() => setRulesOpen(false)} className="mt-4 h-11 w-full rounded-2xl bg-slate-800 text-sm font-black text-white active:scale-95 transition">Got it</button>
          </div>
        </div>
      )}

      {/* Face preview + take-it dialog — click a face → see her (video) → use her for $9.99. */}
      {faceDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-5" onClick={e => { if (e.target === e.currentTarget) setFaceDialog(null); }}>
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-[#faf7f0]">
            {faceDialog.videoUrl ? (
              /* eslint-disable-next-line jsx-a11y/media-has-caption */
              <video src={faceDialog.videoUrl} poster={faceDialog.imageUrl} controls autoPlay muted playsInline className="aspect-[3/4] w-full bg-black object-cover" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={faceDialog.imageUrl} alt="" className="aspect-[3/4] w-full bg-black object-contain" />
            )}
            <div className="p-4">
              <p className="text-[13px] font-bold text-slate-700">This becomes <b className="text-slate-900">your face</b> — we dress her in your style, always the same face.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => { setImageSource("ours"); setAvatarFaceId(faceDialog.id); setFaceDialog(null); }}
                  className={`bg-slate-800 text-white flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-black ${btn3d}`}>
                  {imageSource === "ours" && avatarFaceId === faceDialog.id ? "✓ This is my face" : "Use this face"}
                </button>
                {getPin() && (
                  <button type="button" onClick={() => void startFaceCrop(faceDialog.imageUrl, faceDialog.id)}
                    className="flex h-12 items-center justify-center rounded-2xl border-[1.5px] border-slate-400 px-3 text-sm font-black text-slate-800">✂️ Crop</button>
                )}
                <button type="button" onClick={() => setFaceDialog(null)}
                  className="flex h-12 items-center justify-center rounded-2xl border-[1.5px] border-slate-400 px-4 text-sm font-black text-slate-800">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save confirmation — proves what was saved (shows the new photo) before leaving. */}
      {savedDone && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-black/15 bg-[#141210] p-6 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-800 text-white text-2xl font-black">✓</span>
            <h3 className="mt-3 text-lg font-black text-slate-900">Saved!</h3>
            <p className="mt-1 text-[15px] font-bold text-slate-700">{savedDone.photo ? "The profile photo has been updated." : "Changes saved."}</p>
            {savedDone.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={savedDone.photo} alt="" className="mx-auto mt-4 h-40 w-32 rounded-2xl object-cover object-top ring-2 ring-emerald-400/40" />
            )}
            <button type="button" onClick={() => router.push("/admin?tab=curators")}
              className={`bg-slate-800 text-white mt-5 w-full rounded-full px-5 py-3 text-sm font-black ${btn3d}`}>Back to models</button>
          </div>
        </div>
      )}
    </div>
  );
}
