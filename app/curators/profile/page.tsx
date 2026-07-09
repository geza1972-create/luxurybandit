"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Loader2, Check, Sparkles, LogOut } from "lucide-react";
import { getStoredAuthSession, sendMagicLink, signOut } from "@/lib/supabase-auth-client";
import { TagField, PillRow, PhotoCropper, readPhotoFile } from "../taste-form";

const splitTags = (s?: string) => (s ?? "").split(/,\s*/).map(x => x.trim()).filter(Boolean);

type DB = { brands: string[]; styles: string[]; colors: string[]; fabrics: string[]; occasions: string[] };

export default function CuratorProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [curatorId, setCuratorId] = useState("");
  const [email, setEmail] = useState("");
  const [db, setDb] = useState<DB>({ brands: [], styles: [], colors: [], fabrics: [], occasions: [] });

  // Editable fields
  const [photo, setPhoto] = useState("");      // existing photoUrl or new data URL
  const [photoData, setPhotoData] = useState(""); // new upload only
  const [photoError, setPhotoError] = useState("");
  const [cropSrc, setCropSrc] = useState("");
  // Full-body dressed photo (3:4) — SAME as the application form. Powers her try-ons.
  const [bodyPhotos, setBodyPhotos] = useState<string[]>([]); // new pick (data URL)
  const [bodyExisting, setBodyExisting] = useState<string[]>([]); // already stored
  const [bodyCropSrc, setBodyCropSrc] = useState("");
  const bodyFileRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [instagram, setInstagram] = useState("");
  const [brandChips, setBrandChips] = useState<string[]>([]);
  const [styleChips, setStyleChips] = useState<string[]>([]);
  const [colorChips, setColorChips] = useState<string[]>([]);
  const [fabricChips, setFabricChips] = useState<string[]>([]);
  const [occasionChips, setOccasionChips] = useState<string[]>([]);
  const [genderFocus, setGenderFocus] = useState("");
  const [priceTiers, setPriceTiers] = useState<string[]>([]);
  const [fitFocus, setFitFocus] = useState<string[]>([]);
  const [ageFocus, setAgeFocus] = useState("");
  const [motto, setMotto] = useState("");
  const [bio, setBio] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [baseline, setBaseline] = useState<string | null>(null); // snapshot of loaded values

  // Serialized current form (key order must match the baseline below).
  const snapshot = () => JSON.stringify({
    firstName, lastName, phone, address, instagram,
    brands: brandChips, style: styleChips, colors: colorChips, fabrics: fabricChips, occasions: occasionChips,
    genderFocus, priceTiers, fitFocus, ageFocus, motto, bio, newPhoto: !!photoData, newBody: !!bodyPhotos.length,
  });
  const dirty = baseline !== null && snapshot() !== baseline;

  // Sign-in (when not identified)
  const [signinEmail, setSigninEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [sending, setSending] = useState(false);

  const authHeaders = () => {
    const h: Record<string, string> = {};
    try { const s = getStoredAuthSession(); if (s) h.Authorization = `Bearer ${s.access_token}`; } catch { /**/ }
    try { const id = JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id; if (id) h["x-curator-id"] = id; } catch { /**/ }
    return h;
  };

  useEffect(() => {
    fetch("/api/curator").then(r => r.json()).then((d: any) =>
      setDb({ brands: d.brands ?? [], styles: d.styles ?? [], colors: d.colors ?? [], fabrics: d.fabrics ?? [], occasions: d.occasions ?? [] })
    ).catch(() => {});

    fetch("/api/curator?me=1", { headers: authHeaders() })
      .then(r => r.json())
      .then((d: { curator: any }) => {
        const c = d.curator;
        if (c) {
          setCuratorId(c.id); setEmail(c.email ?? "");
          setPhoto(c.photoUrl ?? "");
          setBodyExisting(Array.isArray(c.photoBodyUrls) ? c.photoBodyUrls : []);
          setFirstName(c.firstName ?? ""); setLastName(c.lastName ?? "");
          setPhone(c.phone ?? ""); setAddress(c.address ?? ""); setInstagram(c.instagram ?? "");
          setBrandChips(splitTags(c.brands)); setStyleChips(splitTags(c.style));
          setColorChips(splitTags(c.colors)); setFabricChips(splitTags(c.fabrics)); setOccasionChips(splitTags(c.occasions));
          setGenderFocus(c.genderFocus ?? ""); setPriceTiers(splitTags(c.priceTiers)); setFitFocus(splitTags(c.fitFocus)); setAgeFocus(c.ageFocus ?? "");
          setMotto(c.motto ?? ""); setBio(c.bio ?? "");
          setBaseline(JSON.stringify({
            firstName: c.firstName ?? "", lastName: c.lastName ?? "", phone: c.phone ?? "", address: c.address ?? "", instagram: c.instagram ?? "",
            brands: splitTags(c.brands), style: splitTags(c.style), colors: splitTags(c.colors), fabrics: splitTags(c.fabrics), occasions: splitTags(c.occasions),
            genderFocus: c.genderFocus ?? "", priceTiers: splitTags(c.priceTiers), fitFocus: splitTags(c.fitFocus), ageFocus: c.ageFocus ?? "", motto: c.motto ?? "", bio: c.bio ?? "", newPhoto: false, newBody: false,
          }));
          // keep lb_curator in sync (so studio works after a fresh login)
          try { localStorage.setItem("lb_curator", JSON.stringify({ id: c.id, firstName: c.firstName, email: c.email, style: c.style })); } catch { /**/ }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ONE login: a visitor who isn't signed in at all goes to the unified login and
  // returns here. (If they ARE signed in but not a curator, we show a Become-a-curator
  // prompt below instead.)
  useEffect(() => {
    if (loading || curatorId) return;
    let hasSession = false;
    try { hasSession = !!getStoredAuthSession(); } catch { /**/ }
    try { hasSession = hasSession || !!JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id; } catch { /**/ }
    if (!hasSession) router.replace("/login?returnTo=/curators/profile");
  }, [loading, curatorId, router]);

  const onPickPhoto = async (file?: File) => {
    if (!file) return;
    setPhotoError("");
    const { src, error: err } = await readPhotoFile(file);
    if (err) { setPhotoError(err); return; }
    if (src) setCropSrc(src);
  };
  const onPickBody = async (file?: File) => {
    if (!file) return;
    setPhotoError("");
    const { src, error: err } = await readPhotoFile(file);
    if (err) { setPhotoError(err); return; }
    if (src) setBodyCropSrc(src);
  };

  const sendLink = async () => {
    const em = signinEmail.trim();
    if (!em) return;
    setSending(true); setError("");
    // Fire the magic link too (best-effort — works once Supabase email is set up).
    void sendMagicLink(em).catch(() => {});
    try {
      const res = await fetch("/api/curator", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signin", email: em }),
      });
      const data = await res.json();
      if (data.curator) {
        try { localStorage.setItem("lb_curator", JSON.stringify({ id: data.curator.id, firstName: data.curator.firstName, email: data.curator.email, style: data.curator.style })); } catch { /**/ }
        window.location.reload(); // reload → loads in profile mode
        return;
      }
      setError("No model found with that email. New here? Become a model below.");
    } catch {
      setError("Could not sign in. Try again.");
    } finally { setSending(false); }
  };

  const save = async () => {
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch("/api/curator", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          action: "update", id: curatorId,
          firstName, lastName, phone, address, instagram,
          brands: brandChips.join(", "), style: styleChips.join(", "),
          colors: colorChips.join(", "), fabrics: fabricChips.join(", "), occasions: occasionChips.join(", "),
          genderFocus, priceTiers: priceTiers.join(", "), fitFocus: fitFocus.join(", "), ageFocus,
          motto, bio, ...(photoData ? { photo: photoData } : {}), ...(bodyPhotos.length ? { bodyPhotos } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || "Could not save."); return; }
      setSaved(true);
      setPhotoData("");
      if (bodyPhotos.length) { setBodyExisting(bodyPhotos); setBodyPhotos([]); }
      setBaseline(JSON.stringify({
        firstName, lastName, phone, address, instagram,
        brands: brandChips, style: styleChips, colors: colorChips, fabrics: fabricChips, occasions: occasionChips,
        genderFocus, priceTiers, fitFocus, ageFocus, motto, bio, newPhoto: false, newBody: false,
      }));
      try { localStorage.setItem("lb_curator", JSON.stringify({ id: curatorId, firstName, email, style: styleChips.join(", ") })); } catch { /**/ }
      setTimeout(() => setSaved(false), 2500);
    } catch { setError("Could not save."); }
    finally { setSaving(false); }
  };

  const field = "h-12 w-full rounded-xl border border-black/12 bg-black/[0.02] px-4 text-sm font-bold text-black outline-none focus:border-black placeholder:text-black/30";
  const label = "mb-1 block text-[11px] font-black uppercase tracking-wider text-black/45";

  if (loading) {
    return <main className="grid min-h-[100dvh] place-items-center bg-white"><Loader2 className="h-6 w-6 animate-spin text-black/30" /></main>;
  }

  // Not a curator. Either we're redirecting to the unified login (no session) or the
  // signed-in account simply isn't a curator yet → invite them to become one.
  if (!curatorId) {
    const signedIn = (() => { try { return !!getStoredAuthSession(); } catch { return false; } })();
    if (!signedIn) {
      return <main className="grid min-h-[100dvh] place-items-center bg-white"><Loader2 className="h-6 w-6 animate-spin text-black/30" /></main>;
    }
    return (
      <main className="flex min-h-[100dvh] flex-col bg-white">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/8 bg-white/95 px-4 py-3 backdrop-blur">
          <button type="button" onClick={() => router.back()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10"><ArrowLeft className="h-4 w-4" /></button>
          <p className="text-sm font-black text-black">Model studio</p>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 text-center">
          <div className="mb-3 text-4xl">✨</div>
          <h1 className="text-2xl font-black text-black">You&apos;re not a model yet</h1>
          <p className="mt-1 text-sm font-medium text-black/55">You&apos;re signed in, but this account doesn&apos;t have a model profile yet. Become a model — it&apos;s free.</p>
          <a href="/curators" className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3.5 text-sm font-black text-white active:scale-95 transition-transform">
            <Sparkles className="h-4 w-4" /> Become a model
          </a>
          <a href="/stores" className="mt-3 text-center text-xs font-black text-black/40">Back to the feed</a>
        </div>
      </main>
    );
  }

  // Identified → editable profile
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[440px] bg-white shadow-[0_0_60px_rgba(0,0,0,0.25)]" style={{ paddingBottom: (dirty || saving || saved) ? "150px" : "80px" }}>
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/8 bg-white/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => router.back()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10"><ArrowLeft className="h-4 w-4" /></button>
        <p className="flex-1 text-sm font-black text-black">My model profile</p>
        <button type="button" onClick={() => { signOut(); try { localStorage.removeItem("lb_curator"); } catch { /**/ } router.push("/stores"); }}
          className="inline-flex items-center gap-1 text-xs font-black text-black/45 active:opacity-70"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
      </div>

      <div className="px-5 pt-5">
        {/* Photo */}
        <div className="flex flex-col items-center gap-2">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="relative grid h-24 w-24 place-items-center overflow-hidden rounded-full border-2 border-dashed border-black/15 bg-black/[0.03] active:scale-95 transition-transform">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="h-full w-full object-cover" />
            ) : <Camera className="h-6 w-6 text-black/30" />}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="text-xs font-black text-cobalt">Change photo</button>
          {photoError && <p className="max-w-xs text-center text-xs font-bold text-red-500">{photoError}</p>}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" className="hidden"
            onChange={e => { void onPickPhoto(e.target.files?.[0]); e.target.value = ""; }} />

          {/* Full-body dressed photo — SAME as the application form. Powers her try-ons. */}
          <p className="mt-4 text-[11px] font-black uppercase tracking-wide text-black/45">Full-body photo · dressed</p>
          <div className="relative">
            <button type="button" onClick={() => bodyFileRef.current?.click()}
              className="relative grid h-44 w-[132px] place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-amber-400/60 bg-black/[0.03] active:scale-95 transition-transform">
              {(bodyPhotos[0] ?? bodyExisting[0]) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bodyPhotos[0] ?? bodyExisting[0]} alt="" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-6 w-6 text-black/30" />
              )}
            </button>
            {!!bodyPhotos[0] && (
              <button type="button" onClick={() => setBodyPhotos([])}
                className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black text-white ring-1 ring-white/25">×</button>
            )}
          </div>
          <p className="max-w-xs text-center text-[11px] font-bold text-black/40">Head to toe, dressed — this is what the AI styles. One good photo is enough.</p>
          <input ref={bodyFileRef} type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" className="hidden"
            onChange={e => { void onPickBody(e.target.files?.[0]); e.target.value = ""; }} />
        </div>

        <div className="mt-3 text-center">
          <p className="text-xs font-bold text-black/40">Signed in as</p>
          <p className="text-sm font-black text-black">{email}</p>
        </div>

        <a href={curatorId ? `/curator/${curatorId}` : "/stores"} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-black text-sm font-black text-white active:scale-95 transition-transform">
          <Sparkles className="h-4 w-4" /> Open my model page
        </a>

        {/* Identity */}
        <div className="mt-5 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><span className={label}>First name</span><input className={field} value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
            <div><span className={label}>Last name</span><input className={field} value={lastName} onChange={e => setLastName(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><span className={label}>Phone <span className="ml-1 rounded bg-black/5 px-1.5 py-0.5 text-[9px] font-bold normal-case tracking-normal text-black/45">🔒 internal</span></span><input type="tel" className={field} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+40 7xx…" /></div>
            <div><span className={label}>Instagram</span><input className={field} value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@handle" /></div>
          </div>
          <div><span className={label}>Address</span><input className={field} value={address} onChange={e => setAddress(e.target.value)} placeholder="City, country" /></div>
        </div>

        {/* Taste */}
        <div className="mt-6 grid gap-4">
          <p className="text-sm font-black text-black">Your taste</p>
          <TagField label="Brands you love" list={db.brands} value={brandChips} onChange={setBrandChips} placeholder="Start typing… Zimmermann, Gucci…" />
          <TagField label="Your style" list={db.styles} value={styleChips} onChange={setStyleChips} placeholder="Start typing… boho, old money…" />
          <PillRow label="Who do you curate for?" options={["Womenswear", "Menswear", "Unisex"]} value={genderFocus} onChange={(v) => setGenderFocus(v as string)} />
          <TagField label="Colors you love" list={db.colors} value={colorChips} onChange={setColorChips} placeholder="Start typing… black, blush…" />
          <TagField label="Fabrics" list={db.fabrics} value={fabricChips} onChange={setFabricChips} placeholder="Start typing… linen, silk…" />
          <TagField label="Occasions" list={db.occasions} value={occasionChips} onChange={setOccasionChips} placeholder="Start typing… evening, resort…" />
          <PillRow label="Price tier" options={["Budget", "Mid-range", "Luxury"]} value={priceTiers} onChange={(v) => setPriceTiers(v as string[])} multi />
          <PillRow label="Fit focus" options={["Standard", "Petite", "Curve / Plus", "Tall"]} value={fitFocus} onChange={(v) => setFitFocus(v as string[])} multi />
          <PillRow label="Audience age" options={["18–25", "25–35", "35–45", "45+"]} value={ageFocus} onChange={(v) => setAgeFocus(v as string)} />
        </div>

        {/* Motto + bio */}
        <div className="mt-5 grid gap-3">
          <div><span className={label}>Motto</span><input className={field} value={motto} onChange={e => setMotto(e.target.value)} placeholder="Bandit the look!" /></div>
          <div><span className={label}>Short bio</span><textarea className={`${field} h-auto py-3 leading-5`} rows={3} value={bio} onChange={e => setBio(e.target.value)} /></div>
        </div>

        {error && <p className="mt-4 text-center text-xs font-bold text-red-500">{error}</p>}
      </div>

      {/* Save bar — only appears when there are unsaved changes (floats above nav) */}
      {(dirty || saving || saved) && (
        <div className="lb-phone-col fixed z-20 border-t border-black/8 bg-white/95 px-5 pt-3 backdrop-blur"
          style={{ bottom: "calc(56px + env(safe-area-inset-bottom))", paddingBottom: "0.75rem" }}>
          <button type="button" onClick={() => void save()} disabled={saving}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-black text-base font-black text-white shadow-lg disabled:opacity-50 active:scale-95 transition-transform">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : saved ? <Check className="h-5 w-5" /> : null}
            {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
          </button>
        </div>
      )}

      {cropSrc && (
        <PhotoCropper src={cropSrc} onCancel={() => setCropSrc("")}
          onDone={(dataUrl) => { setPhoto(dataUrl); setPhotoData(dataUrl); setCropSrc(""); }} />
      )}
      {bodyCropSrc && (
        <PhotoCropper src={bodyCropSrc} aspect="portrait" onCancel={() => setBodyCropSrc("")}
          onDone={(dataUrl) => { setBodyPhotos([dataUrl]); setBodyCropSrc(""); }} />
      )}
    </main>
  );
}
