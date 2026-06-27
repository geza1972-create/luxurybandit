"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Sparkles, Loader2, Check } from "lucide-react";
import { TagField, PillRow, PhotoCropper, readPhotoFile } from "../taste-form";

export default function CuratorApplyPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [cropSrc, setCropSrc] = useState("");
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
  const [ageFocus, setAgeFocus] = useState("");

  const [db, setDb] = useState<{ brands: string[]; styles: string[]; colors: string[]; fabrics: string[]; occasions: string[] }>(
    { brands: [], styles: [], colors: [], fabrics: [], occasions: [] }
  );
  useEffect(() => {
    fetch("/api/curator").then(r => r.json()).then((d: any) => {
      setDb({ brands: d.brands ?? [], styles: d.styles ?? [], colors: d.colors ?? [], fabrics: d.fabrics ?? [], occasions: d.occasions ?? [] });
    }).catch(() => {});
  }, []);

  const brands = brandChips.join(", ");
  const style = styleChips.join(", ");

  const [motto, setMotto] = useState("");
  const [bio, setBio] = useState("");

  const [mottoIdeas, setMottoIdeas] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");

  const onPickPhoto = async (file?: File) => {
    if (!file) return;
    setPhotoError("");
    const { src, error } = await readPhotoFile(file);
    if (error) { setPhotoError(error); return; }
    if (src) setCropSrc(src);
  };

  const suggest = async () => {
    if (!brands.trim() && !style.trim()) { setError("Add a few brands or your style first."); return; }
    setError(""); setSuggesting(true);
    try {
      const res = await fetch("/api/curator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suggest", brands, style }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || "Could not get suggestions."); return; }
      setMottoIdeas(Array.isArray(data.mottos) ? data.mottos : []);
      if (data.bio && !bio) setBio(data.bio);
      if (data.mottos?.[0] && !motto) setMotto(data.mottos[0]);
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
    setError(""); setSubmitting(true);
    try {
      const res = await fetch("/api/curator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          firstName, lastName, email, phone, address, instagram, brands, style, motto, bio, photo,
          genderFocus,
          colors: colorChips.join(", "),
          fabrics: fabricChips.join(", "),
          occasions: occasionChips.join(", "),
          priceTiers: priceTiers.join(", "),
          fitFocus: fitFocus.join(", "),
          ageFocus,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || "Could not submit."); return; }
      // Auto-approved for now → log them straight in so they can start curating.
      if (data.curator?.id) {
        try { localStorage.setItem("lb_curator", JSON.stringify(data.curator)); } catch { /**/ }
        try { window.dispatchEvent(new Event("luxurybandit-auth-updated")); } catch { /**/ }
      }
      setApplied(true);
    } catch {
      setError("Could not submit.");
    } finally {
      setSubmitting(false);
    }
  };

  const field = "h-12 w-full rounded-xl border border-black/12 bg-black/[0.02] px-4 text-sm font-bold text-black outline-none focus:border-black placeholder:text-black/30";
  const label = "mb-1 block text-[11px] font-black uppercase tracking-wider text-black/45";

  if (applied) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-white px-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl">✓</div>
          <h1 className="mt-4 text-xl font-black text-black">You&apos;re in{firstName ? `, ${firstName}` : ""}!</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-black/55">
            Your curator account is active. Head to the Studio to create your first look — or sign in any time with your email.
          </p>
          <button type="button" onClick={() => router.push("/studio")}
            className="mt-5 inline-flex h-12 items-center justify-center rounded-2xl bg-black px-6 text-sm font-black text-white active:scale-95 transition-transform">
            Go to Studio →
          </button>
          <button type="button" onClick={() => router.push("/stores")}
            className="mt-2 inline-flex h-11 items-center justify-center rounded-2xl px-6 text-sm font-black text-black/55 active:scale-95 transition-transform">
            Back to LuxuryBandit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-white" style={{ paddingBottom: "calc(130px + env(safe-area-inset-bottom))" }}>
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/8 bg-white/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => router.back()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10 text-black active:scale-90 transition-transform">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-black text-black">Become a curator</p>
      </div>

      <div className="px-5 pt-5">
        {/* Photo */}
        <div className="flex flex-col items-center gap-2">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="relative grid h-24 w-24 place-items-center overflow-hidden rounded-full border-2 border-dashed border-black/15 bg-black/[0.03] active:scale-95 transition-transform">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-6 w-6 text-black/30" />
            )}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="text-xs font-black text-cobalt">
            {photo ? "Change photo" : "Add your photo"}
          </button>
          {photoError && <p className="max-w-xs text-center text-xs font-bold text-red-500">{photoError}</p>}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" className="hidden"
            onChange={e => { void onPickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
        </div>

        {/* Identity */}
        <div className="mt-5 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><span className={label}>First name</span><input className={field} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Maria" /></div>
            <div><span className={label}>Last name</span><input className={field} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Popescu" /></div>
          </div>
          <div><span className={label}>Email</span><input type="email" className={field} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><span className={label}>Phone</span><input type="tel" className={field} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+40 7xx…" /></div>
            <div><span className={label}>Instagram</span><input className={field} value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@handle" /></div>
          </div>
          <div><span className={label}>Address</span><input className={field} value={address} onChange={e => setAddress(e.target.value)} placeholder="City, country" /></div>
        </div>

        {/* Taste */}
        <div className="mt-6">
          <p className="text-sm font-black text-black">Your taste</p>
          <p className="mt-0.5 text-xs font-medium text-black/50">AI uses this to suggest your motto & bio.</p>
          <div className="mt-3 grid gap-4">
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

          <button type="button" onClick={() => void suggest()} disabled={suggesting}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-cobalt/30 bg-cobalt/[0.05] text-sm font-black text-cobalt disabled:opacity-50 active:scale-95 transition-transform">
            {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {suggesting ? "Thinking…" : "Suggest my motto & bio with AI"}
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
                    className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-black transition ${motto === m ? "border-cobalt bg-cobalt text-white" : "border-black/12 bg-black/[0.03] text-black/70"}`}>
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

        {error && <p className="mt-4 text-center text-xs font-bold text-red-500">{error}</p>}
      </div>

      {/* Submit */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/8 bg-white/95 px-5 pt-3 backdrop-blur"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
        <button type="button" onClick={() => void submit()} disabled={submitting}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-black text-base font-black text-white shadow-lg disabled:opacity-50 active:scale-95 transition-transform">
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          {submitting ? "Setting up…" : "Start curating"}
        </button>
        <p className="mt-1.5 text-center text-[10px] font-bold text-black/35">
          Start with free credits to prove yourself · earn more from likes &amp; try-ons
        </p>
      </div>

      {cropSrc && (
        <PhotoCropper src={cropSrc} onCancel={() => setCropSrc("")}
          onDone={(dataUrl) => { setPhoto(dataUrl); setCropSrc(""); }} />
      )}
    </div>
  );
}
