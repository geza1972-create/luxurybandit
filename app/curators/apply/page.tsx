"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Sparkles, Loader2, Check, Coins } from "lucide-react";
import { TagField, PhotoCropper, readPhotoFile } from "../taste-form";
import { getStoredAuthSession, signInWithPassword, signUpWithPassword, signInWithOAuth, type SupabaseAuthSession } from "@/lib/supabase-auth-client";
import { countryOptions } from "@/lib/countries";
import { SPONSORS } from "@/lib/sponsors";
import ModelCard from "@/components/ModelCard";
import PasswordInput from "@/components/PasswordInput";

const COUNTRIES = countryOptions();
const BELLA_ID = "curator-1783683672619-td4cy"; // the flagship example card shown to every new applicant

// Elegant single names suggested (randomly) in the influencer-name field on load.
const NAME_SUGGESTIONS = [
  "Amaya", "Lila", "Serena", "Giselle", "Milena", "Valeria", "Aurora", "Vivienne", "Noor", "Leila",
  "Mireille", "Renata", "Ciara", "Solene", "Anouk", "Faye", "Cleo", "Juno", "Esme", "Odette",
  "Elodie", "Yara", "Celine", "Antonia", "Aveline", "Marlow", "Sabine", "Ondine", "Liora", "Suri",
  "Noelia", "Calla", "Elina", "Rhea", "Talise", "Ysabel", "Ottilie", "Mavie", "Nayara", "Selene",
];

export default function CuratorApplyPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // Language — Romanian by default (this application page's primary audience), English optional.
  const [lang, setLang] = useState<"ro" | "en">("ro");
  const T = {
    ro: {
      heroTitle: "Devino model LuxuryBandit",
      heroSubtitle: <>Aplici cu <b className="text-slate-900">propria ta poză</b>, încarci <b className="text-slate-900">videoclipuri private</b> și păstrezi <b className="text-slate-900">50% din fiecare abonament</b>. Trei pași rapizi — circa două minute.</>,
      itsYouLabel: <>EȘTI TU — propria ta poză</>,
      itsYouBody: <>Aplici cu <b>propria ta poză</b>. Vei încărca <b>videoclipurile tale private</b>, și păstrezi <b className="text-slate-900">50% din fiecare abonament</b> plătit de fani. Noi ne ocupăm de tehnologie &amp; plăți.</>,
      cancel: "Anulează",
      editModel: "Editează model",
      saveChanges: "Salvează",
      sending: "Se trimite…",
      saving: "Se salvează…",
      submitCta: "Trimite aplicația — este gratuit",
      earnings: (link: string) => <>💰 Câștigi <b>50% din fiecare abonament</b> plătit de fanii tăi pentru a-ți debloca lumea privată — banii ajung automat în contul tău. Cu cât mai mulți fani se abonează, cu atât câștigi mai mult. <a href={link} className="underline underline-offset-2">Cum funcționează câștigurile →</a></>,
      appliedTitle: (name: string) => `Aplicație primită${name ? `, ${name}` : ""}!`,
      appliedBody: "Echipa noastră analizează personal fiecare model LuxuryBandit. Vei primi un email imediat ce ești aprobat(ă) — apoi te conectezi și începi să câștigi.",
      backHome: "Înapoi la LuxuryBandit",
    },
    en: {
      heroTitle: "Become a LuxuryBandit model",
      heroSubtitle: <>Join with <b className="text-slate-900">your own photo</b>, upload your <b className="text-slate-900">private videos</b>, and keep <b className="text-slate-900">50% of every subscription</b>. Three quick steps — about two minutes.</>,
      itsYouLabel: <>It&apos;s YOU — your own photo</>,
      itsYouBody: <>You join with <b>your own photo</b>. You&apos;ll upload <b>your private videos</b>, and you keep <b className="text-slate-900">50% of every subscription</b> your fans pay. We handle the tech &amp; payments.</>,
      cancel: "Cancel",
      editModel: "Edit model",
      saveChanges: "Save changes",
      sending: "Sending…",
      saving: "Saving…",
      submitCta: "Send my application — it's free",
      earnings: (link: string) => <>💰 You earn <b>50% of every subscription</b> your fans pay to unlock your private world — it lands in your account automatically. The more fans subscribe, the more you earn. <a href={link} className="underline underline-offset-2">How earnings work →</a></>,
      appliedTitle: (name: string) => `Application received${name ? `, ${name}` : ""}!`,
      appliedBody: "Our team reviews every LuxuryBandit Influencer personally. You'll get an email as soon as you're approved — then just sign in and start earning.",
      backHome: "Back to LuxuryBandit",
    },
  }[lang];
  // Prices come from the admin-editable price list (change once there). Defaults until loaded.
  const [pricing, setPricing] = useState({ subscriptionMonthlyCents: 499, chatPassCents: 399, videoGenCents: 399 });
  useEffect(() => { fetch("/api/try-this-look?pricing=1").then(r => r.json()).then(d => { if (d.pricing) setPricing(p => ({ ...p, ...d.pricing })); }).catch(() => {}); }, []);
  const fmtPrice = (c: number) => { const n = Math.max(0, Math.round(c)) / 100; return `$${n % 1 ? n.toFixed(2) : n.toLocaleString("en-US")}`; };
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
  const [country, setCountry] = useState("");          // ISO-2 code (e.g. "RO")
  const [countryName, setCountryName] = useState("");  // what's typed in the autofill input
  // On first load (new application only) drop a random elegant name into the field as a suggestion.
  useEffect(() => {
    if (editId) return;
    setModelName(prev => prev.trim() ? prev : NAME_SUGGESTIONS[Math.floor(Math.random() * NAME_SUGGESTIONS.length)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
  const [imageSource, setImageSource] = useState<"own" | "ours">("own"); // real models apply with THEIR OWN photo (no AI-face selection anymore)
  const [roleModels, setRoleModels] = useState<{ id: string; name: string; photoUrl?: string; style?: string }[]>([]);
  const [avatarFaces, setAvatarFaces] = useState<{ id: string; imageUrl: string; videoUrl?: string; claimed: boolean; sold?: boolean; createdAt?: string }[]>([]);
  const [outfitThumbs, setOutfitThumbs] = useState<string[]>([]); // small wardrobe preview on her card: 1 dress + 4 lingerie
  const [demoClips, setDemoClips] = useState<{ poster: string; video: string; private: boolean }[]>([]); // real posted SLIDES (Bella's) shown in the preview card — NOT wardrobe thumbnails
  const [demoModel, setDemoModel] = useState<{ name: string; photo: string }>({ name: "", photo: "" }); // the example card = Bella (name + photo), so the preview shows a REAL finished card
  const [mySlides, setMySlides] = useState<string[]>(["", "", "", ""]); // 4 own photos for her card — the LAST TWO are private; shown as her card slides once the main photo is up
  const [slideCropSrc, setSlideCropSrc] = useState(""); // a slide photo waiting to be cropped
  const slideFileRef = useRef<HTMLInputElement>(null);
  const slideIdxRef = useRef(0); // which of the 4 slots is being filled
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

  // Real posted SLIDES for the preview card — ALWAYS Bella's (the flagship example), pinned by
  // id so it never drifts to whichever model happens to have the newest post in the general feed.
  useEffect(() => {
    fetch(`/api/bella-carousel?model=${BELLA_ID}&surface=profile`).then(r => r.json()).then((d: any) => {
      const arr = Array.isArray(d?.slides) ? d.slides : [];
      const clips = arr.slice(0, 6).map((s: any) => s.kind === "video"
        // No posterUrl → leave poster EMPTY so the card shows the video's own first frame
        // (never the video URL as an <img>, which renders a broken image).
        ? { poster: s.posterUrl || "", video: s.mediaUrl || "", private: false }
        : { poster: s.mediaUrl || "", video: "", private: false });
      setDemoClips(clips.filter((c: any) => c.poster || c.video));
    }).catch(() => {});
    fetch(`/api/curator?profile=${BELLA_ID}`).then(r => r.json()).then((d: any) => {
      const p = d?.profile;
      if (p) setDemoModel({ name: String(p.firstName || "Bella"), photo: String(p.photoUrl || "") });
    }).catch(() => {});
  }, []);

  const brands = brandChips.join(", ");
  const style = styleChips.join(", ");
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()); // real email format required

  const [motto, setMotto] = useState("");
  const [bio, setBio] = useState("");
  const [cardTitle, setCardTitle] = useState("");   // brand title on her card, e.g. "Monaco Influencer"
  const [cardIntro, setCardIntro] = useState("");   // her ABOUT-slide introduction
  const [cardSponsor, setCardSponsor] = useState(""); // sponsor shown on the intro slide
  const [aiHint, setAiHint] = useState(""); // rough free-text for the AI (optional)

  const [mottoIdeas, setMottoIdeas] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false); // 18+, real me, accepts the model rules
  const [agreeError, setAgreeError] = useState(false); // turn the consent box red if they submit without ticking it
  const [showErrors, setShowErrors] = useState(false); // on Send: highlight EVERY empty required field (+ missing photos) red
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
        { const cc = String(c.country ?? "").toUpperCase(); setCountry(cc); setCountryName(COUNTRIES.find(x => x.code === cc)?.name ?? ""); }
        setInstagram(c.instagram ?? "");
        setBrandChips(split(c.brands)); setStyleChips(split(c.style));
        setColorChips(split(c.colors)); setFabricChips(split(c.fabrics)); setOccasionChips(split(c.occasions));
        setGenderFocus(c.genderFocus ?? ""); setPriceTiers(split(c.priceTiers)); setFitFocus(split(c.fitFocus));
        setMotto(c.motto ?? ""); setBio(c.bio ?? "");
        setCardTitle((c as any).title ?? ""); setCardIntro((c as any).intro ?? ""); setCardSponsor((c as any).sponsor ?? "");
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

  // Her 4 card-slide photos (last 2 private). Tap a slot → pick → crop → fill it.
  const pickSlide = (i: number) => { slideIdxRef.current = i; slideFileRef.current?.click(); };
  const onPickSlide = async (file?: File) => {
    if (!file) return;
    setPhotoError("");
    const { src, error } = await readPhotoFile(file);
    if (error) { setPhotoError(error); return; }
    if (src) setSlideCropSrc(src);
  };
  const deleteSlide = (i: number) => setMySlides(prev => { const n = [...prev]; n[i] = ""; return n; });

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
    setShowErrors(true);    // highlight every empty required field red
    if (!modelName.trim() || !firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("Please fill in all the required fields — they're highlighted in red."); return;
    }
    if (!emailOk) { setError("Please enter a valid email address."); return; }
    // Photos are REQUIRED for a real application: her main photo + all 4 card photos.
    if (!editId) {
      if (!photo) { setError("Please upload your main photo first (tap “Your own photo”)."); return; }
      if (mySlides.filter(Boolean).length < 4) { setError("Please upload all 4 photos of yourself — they’re required."); return; }
    }
    if (nameStatus === "taken") { setError("That model name is taken — please choose another."); return; }
    if (!agreed) { setError("Please confirm you're 18+, the photos are really you, and you accept the Terms & Conditions."); return; }
    setError(""); setSubmitting(true);
    try {
      const shared = {
        modelName, firstName, lastName, email, phone, address, country, instagram, brands, style, motto, bio,
        title: cardTitle, intro: cardIntro, sponsor: cardSponsor,
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
        body: JSON.stringify({ action: "apply", ...shared, ...(profilePhotos.length ? { profilePhotos } : {}), ...(photo.startsWith("data:image/") ? { photo, ...(photoFull.startsWith("data:image/") ? { photoFull } : {}) } : {}), ...(bodyPhotos.length ? { bodyPhotos } : {}), ...(mySlides.some(Boolean) ? { slides: mySlides.map((u, i) => u ? { image: u, private: i >= 2 } : null).filter(Boolean) } : {}) }),
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
      // Applying is FREE — no payment. Real models are reviewed personally, then invited by
      // email to sign in and start uploading. They earn 50% of every subscription their fans pay.
      clearDraft();
      setApplied(true);
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

  // No login required to apply — the CTA goes straight to the form; the email is collected in
  // the form and the login is set up later via the onboarding email. (Wall kept but disabled.)
  if (!authReady) return <div className="min-h-screen bg-[#faf7f0]" />;
  if (false && !authSession && !isAdminEdit) {
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
            <PasswordInput autoComplete={authTab === "register" ? "new-password" : "current-password"} className={field}
              value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Password (6+ characters)"
              onKeyDown={e => { if (e.key === "Enter") void doAuth(); }} />
            {authErr && <p className="text-[13px] font-bold text-red-500">{authErr}</p>}
            {authMsg && <p className="text-[13px] font-bold text-amber-600">{authMsg}</p>}
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
          <h1 className="mt-4 text-xl font-black text-slate-900">{T.appliedTitle(firstName)}</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
            {T.appliedBody}
          </p>
          <button type="button" onClick={() => router.push("/stores")}
            className={`bg-slate-800 text-white mt-5 inline-flex h-12 items-center justify-center rounded-2xl px-6 text-sm font-black ${btn3d}`}>
            {T.backHome}
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
          <p className="flex-1 text-sm font-black text-slate-900">{T.editModel}{firstName ? ` — ${firstName}` : ""}</p>
          <button type="button" onClick={cancel}
            className="shrink-0 rounded-full border border-black/15 px-4 py-2 text-sm font-black text-slate-800 active:scale-95 transition-transform">
            {T.cancel}
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
            {T.cancel}
          </button>
          <div className="absolute right-3 bottom-3 flex gap-1 rounded-full bg-black/45 p-1 backdrop-blur">
            {(["ro", "en"] as const).map(l => (
              <button key={l} type="button" onClick={() => setLang(l)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-black transition ${lang === l ? "bg-white text-slate-900" : "text-white/80"}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-5 pt-6">
        {/* Header for the applicant flow (replaces the old welcome copy). */}
        {!editId && <div className="text-center">
          <h1 className="text-[26px] font-black leading-tight text-slate-900">{T.heroTitle}</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-700">
            {T.heroSubtitle}
          </p>
        </div>}


        {/* Your own photo — ABOVE the card (upload here → it appears on the card below). */}
        <div className="mt-4 flex justify-center">
          <div className={`relative aspect-[3/4] w-[52%] max-w-[220px] shrink-0 overflow-hidden rounded-2xl border-2 bg-black/[0.04] ${showErrors && !photo ? "border-red-500 ring-2 ring-red-500/30" : "border-slate-800"}`}>
            {photo ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => { setImageSource("own"); fileRef.current?.click(); }}
                  className="absolute inset-0 transition active:scale-95" aria-label="Change photo">
                  <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-[10px] font-black uppercase tracking-wide text-white">Tap to change / re-crop</span>
                </button>
                <button type="button" onClick={() => { setPhoto(""); setPhotoFull(""); }} aria-label="Delete photo"
                  className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-red-600 text-[14px] font-black text-white shadow ring-2 ring-white/70 active:scale-90 transition">✕</button>
              </>
            ) : (
              <button type="button" onClick={() => { setImageSource("own"); fileRef.current?.click(); }}
                className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-2 text-center text-slate-600 transition active:scale-95">
                <span className="text-[28px]">📸</span>
                <span className="text-[12px] font-black uppercase leading-tight">Your own photo</span>
                <span className="text-[10px] font-bold text-slate-400">upload + crop (3:4)</span>
              </button>
            )}
          </div>
        </div>

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
          const heroVideo = imageSource === "own" ? "" : (sel?.videoUrl || firstFree?.videoUrl || "");
          const nm = modelName.trim() || "Your influencer";
          const tag = motto.trim() || "Your vibe, every day 💛";
          // The preview STARTS as Bella's example card and becomes HERS as she fills the form:
          // her uploaded photo → card face, her name → card name, GS jumps to 10 once she's named.
          const hasName = !!modelName.trim();
          const cardName = modelName.trim() || demoModel.name || "Your influencer";
          const cardPhoto = photo || demoModel.photo || heroSrc;
          if (!cardPhoto) return null;
          // Her 4 slide photos → card clips (LAST TWO private). Once she's uploaded her main photo
          // the card shows HER slides (empty until she adds them); before that, Bella's demo.
          const myClips = mySlides
            .map((url, i) => url ? { poster: url, video: "", private: i >= 2 } : null)
            .filter(Boolean) as { poster: string; video: string; private: boolean }[];
          const cardClips = photo ? myClips : demoClips;
          return (
            <div id="lb-preview-card" className="-mx-5 mt-5 scroll-mt-4">
              <ModelCard
                id="" serial="PREVIEW" name={cardName} photo={cardPhoto} video="" poster={cardPhoto}
                clips={cardClips} valueLabel={hasName ? "10" : "1"} looks={24} bio={bio.trim()}
                brands={brandChips.join(", ")} tagline={tag} realModel={imageSource === "own"}
                country={country} hideOwner
              />
            </div>
          );
        })()}

        {/* 4 photos for her CARD — shown once the main photo is up. Last two are PRIVATE. */}
        {photo && (
          <div className="mt-4">
            <p className="text-center text-[13px] font-black text-slate-900">Upload 4 photos of yourself <span className="text-red-500">*</span></p>
            <p className="mx-auto mt-0.5 max-w-xs text-center text-[11px] font-bold text-slate-500">They become your card. The last two are <b className="text-amber-600">private</b> — only your subscribers see them.</p>
            <div className="mx-auto mt-2.5 grid max-w-sm grid-cols-4 gap-2">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`relative aspect-[3/4] overflow-hidden rounded-xl border-2 bg-black/[0.04] ${showErrors && !mySlides[i] ? "border-red-500 ring-2 ring-red-500/30" : "border-slate-300"}`}>
                  {mySlides[i] ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mySlides[i]} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => deleteSlide(i)} aria-label="Delete photo"
                        className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-red-600 text-[10px] font-black text-white shadow ring-1 ring-white/70 active:scale-90">✕</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => pickSlide(i)}
                      className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-500 active:scale-95 transition">
                      <span className="text-[20px] leading-none">＋</span>
                      <span className="text-center text-[8px] font-black uppercase leading-tight">Photo<br />Upload</span>
                    </button>
                  )}
                  {i >= 2 && <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-amber-500/90 py-px text-center text-[7px] font-black uppercase tracking-wide text-white">Private</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        <input ref={slideFileRef} type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" className="hidden"
          onChange={e => { void onPickSlide(e.target.files?.[0]); e.target.value = ""; }} />

        <div className="mt-3 rounded-2xl border border-black/15 bg-black/[0.04] p-4">
          <span className={label}>{T.itsYouLabel}</span>
          <p className="mt-0.5 text-[13px] font-bold text-slate-600">{T.itsYouBody}</p>
          <p className="mt-2 text-[11px] font-bold text-slate-500">To protect everyone, you can only use YOUR verified photo — never someone else&apos;s face.</p>
        </div>

        {/* What you get as a LuxuryBandit model — real model, free to join, earns 50%. */}
        <div className="mt-5 rounded-2xl border border-black/12 bg-white p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">As a LuxuryBandit model</p>
          <h3 className="mt-0.5 text-[16px] font-black text-slate-900">What you get</h3>
          <table className="mt-2.5 w-full text-[13px] font-bold text-slate-700">
            <tbody className="[&>tr>td]:border-b [&>tr>td]:border-black/[0.06] [&>tr>td]:py-2 [&>tr:last-child>td]:border-0 [&>tr:last-child>td]:pb-0">
              <tr>
                <td className="pr-3 align-top"><span className="mr-1.5">📱</span> Your own public influencer profile — like the card above.</td>
                <td className="whitespace-nowrap text-right align-top text-slate-500">free</td>
              </tr>
              <tr>
                <td className="pr-3 align-top"><span className="mr-1.5">🎬</span> Upload your own private photos &amp; videos for your fans.</td>
                <td className="whitespace-nowrap text-right align-top text-slate-500">free</td>
              </tr>
              <tr>
                <td className="pr-3 align-top"><span className="mr-1.5">💛</span> Fans subscribe to unlock your private world.</td>
                <td className="whitespace-nowrap text-right align-top text-slate-900">you earn 50%</td>
              </tr>
              <tr>
                <td className="pr-3 align-top"><span className="mr-1.5">🤖</span> A free AI assistant chats with your fans for you, day &amp; night.</td>
                <td className="whitespace-nowrap text-right align-top text-slate-500">included</td>
              </tr>
              <tr>
                <td className="pr-3 align-top"><span className="mr-1.5">📈</span> Fresh outfit &amp; video ideas from us every single day.</td>
                <td className="whitespace-nowrap text-right align-top text-slate-500">included</td>
              </tr>
            </tbody>
          </table>
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
              <input className={`${field} ${(showErrors && !modelName.trim()) || nameStatus === "taken" ? "ring-2 ring-red-500" : nameStatus === "available" ? "ring-2 ring-amber-500" : ""}`}
                value={modelName} onChange={e => setModelName(e.target.value)} placeholder="e.g. Bella Rose — your public influencer name" />
              {nameStatus === "checking" && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
              {nameStatus === "available" && <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600" />}
            </div>
            {nameStatus === "taken"
              ? <p className="mt-1 text-[12px] font-bold text-red-500">That name is taken — please choose another.</p>
              : nameStatus === "available"
                ? <p className="mt-1 text-[12px] font-bold text-amber-600">✓ Available — this name is yours.</p>
                : <p className="mt-1 text-[12px] font-bold text-slate-600">This is the name fans see. Your real name below stays private.</p>}
            <p className="mt-1 text-[11px] font-black text-slate-500">⚠ Choose carefully — your model name <b className="text-slate-700">can&apos;t be changed later</b>.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><span className={label}>Your first name</span><input className={`${field} ${showErrors && !firstName.trim() ? "ring-2 ring-red-500" : ""}`} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Maria" /></div>
            <div><span className={label}>Your last name</span><input className={`${field} ${showErrors && !lastName.trim() ? "ring-2 ring-red-500" : ""}`} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Popescu" /></div>
          </div>
          <div>
            <span className={label}>Email</span>
            <input type="email" inputMode="email" autoComplete="email" className={`${field} ${(showErrors && !email.trim()) || (email.trim() && !emailOk) ? "ring-2 ring-red-500" : ""}`} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
            {email.trim() && !emailOk && <p className="mt-1 text-[12px] font-bold text-red-500">Please enter a valid email address.</p>}
          </div>
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
          <div>
            <span className={label}>Country</span>
            <input className={field} list="lb-country-list" value={countryName} placeholder="Start typing… e.g. Romania"
              onChange={e => { const v = e.target.value; setCountryName(v); const hit = COUNTRIES.find(c => c.name.toLowerCase() === v.trim().toLowerCase()); setCountry(hit?.code ?? ""); }} />
            <datalist id="lb-country-list">
              {COUNTRIES.map(c => <option key={c.code} value={c.name} />)}
            </datalist>
          </div>
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
          {/* Card identity — the same dynamic fields the Model Card shows (title / ABOUT / sponsor). */}
          <div>
            <span className={label}>Title / role <span className="font-bold normal-case text-slate-400">· optional</span></span>
            <input className={field} value={cardTitle} onChange={e => setCardTitle(e.target.value)} placeholder="e.g. Monaco Influencer" />
          </div>
          <div>
            <span className={label}>About / introduction <span className="font-bold normal-case text-slate-400">· her ABOUT slide</span></span>
            <textarea className={`${field} h-auto py-3 leading-5`} rows={3} value={cardIntro} onChange={e => setCardIntro(e.target.value)} placeholder="Hi, I'm … — I travel the world, test the newest trends…" />
          </div>
          <div>
            <span className={label}>Sponsor <span className="font-bold normal-case text-slate-400">· optional</span></span>
            {/* Picked from the admin-provided sponsor list (lib/sponsors) — never free text. */}
            <select className={field} value={cardSponsor} onChange={e => setCardSponsor(e.target.value)}>
              <option value="">No sponsor</option>
              {SPONSORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {/* Jump back up to the live preview card. */}
          <button type="button" onClick={() => document.getElementById("lb-preview-card")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="lb-gold mt-1 flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-black active:scale-95 transition">
            👁 Preview card
          </button>
          <p className="mt-2 text-center text-[12px] font-bold text-slate-500">Nothing goes public yet — every application is reviewed first before your card goes live.</p>
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
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          {submitting ? (editId ? T.saving : T.sending) : (editId ? T.saveChanges : T.submitCta)}
        </button>
        <p className="mt-1.5 text-center text-[12px] font-bold text-slate-600">
          {editId ? "Changes go live immediately" : <>Free to apply · reviewed personally · you keep <b className="text-slate-900">50% of every subscription</b></>}
        </p>
      </div>

      {cropSrc && (
        <PhotoCropper src={cropSrc} aspect="portrait" onCancel={() => setCropSrc("")}
          onDone={(dataUrl) => { setPhoto(dataUrl); setPhotoFull(cropSrc); setCropSrc(""); }} />
      )}
      {bodyCropSrc && (
        <PhotoCropper src={bodyCropSrc} aspect="portrait" onCancel={() => setBodyCropSrc("")}
          onDone={(dataUrl) => { setBodyPhotos([dataUrl]); setBodyCropSrc(""); }} />
      )}
      {profileCropSrc && (
        <PhotoCropper src={profileCropSrc} aspect="portrait" onCancel={() => setProfileCropSrc("")}
          onDone={(dataUrl) => { setProfilePhotos(prev => [...prev, dataUrl].slice(0, 4)); setProfileCropSrc(""); }} />
      )}
      {slideCropSrc && (
        <PhotoCropper src={slideCropSrc} aspect="portrait" onCancel={() => setSlideCropSrc("")}
          onDone={(dataUrl) => { setMySlides(prev => { const n = [...prev]; n[slideIdxRef.current] = dataUrl; return n; }); setSlideCropSrc(""); }} />
      )}

      {/* "You get one shot" rules — opened from the link under the photo. */}
      {rulesOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={e => { if (e.target === e.currentTarget) setRulesOpen(false); }}>
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-[#faf7f0] p-5 text-center">
            <p className="text-[16px] font-black text-slate-900">⚠️ You get one shot — send your very best photos.</p>
            <p className="mt-2 text-[13px] font-bold leading-relaxed text-slate-700">Photos that are blurry, hide your face (hat/sunglasses), fake, or don&apos;t fit our luxury concept are rejected — and a rejected application can&apos;t apply again. Sharp, well-lit, real photos only.</p>
            <p className="mt-3 text-[13px] font-bold leading-relaxed text-slate-900">{T.earnings("/earnings")}</p>
            <p className="mt-2 text-[13px] font-bold leading-relaxed text-slate-900">🎬 Once you&apos;re approved you upload your own <b>private photos &amp; videos</b> — your fans subscribe to see them. Applying is free. Serious creators only.</p>
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
                {/* Face cropping lives in the Admin dashboard now — not in the signup funnel. */}
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
              <img src={savedDone.photo} alt="" className="mx-auto mt-4 h-40 w-32 rounded-2xl object-cover object-top ring-2 ring-amber-400/40" />
            )}
            <button type="button" onClick={() => router.push("/admin?tab=curators")}
              className={`bg-slate-800 text-white mt-5 w-full rounded-full px-5 py-3 text-sm font-black ${btn3d}`}>Back to models</button>
          </div>
        </div>
      )}
    </div>
  );
}
