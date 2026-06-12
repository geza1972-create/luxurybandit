"use client";

export const dynamic = "force-dynamic";

import {
  Loader2, Plus, Pencil, Trash2, Sparkles, Lock,
  CheckCircle2, ImagePlus, X, User, ChevronDown,
  LogOut, KeyRound, Phone, Mail, MessageCircle
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getStoredAuthSession, signOut, updateUserProfile, getAuthUser } from "@/lib/supabase-auth-client";

type Look = {
  id: string;
  name: string;
  price?: string;
  salePrice?: string;
  productNote?: string;
  hashtags?: string;
  inStock?: boolean;
  published?: boolean;
  imageUrl?: string;
  createdAt: string;
};

type Store = {
  id: string;
  name: string;
  slug: string;
  address?: string;
  description?: string;
  instagram?: string;
  aiEnabled?: boolean;
  aiCreditsLimit?: number;
  aiCreditsUsed?: number;
  pendingAiRequest?: boolean;
};

type SellerData = { store: Store; looks: Look[] };

type FormState = {
  name: string;
  price: string;
  salePrice: string;
  productNote: string;
  hashtags: string;
  inStock: boolean;
  imageFile: File | null;
  imagePreview: string | null;
};

const emptyForm = (): FormState => ({
  name: "", price: "", salePrice: "", productNote: "",
  hashtags: "", inStock: true, imageFile: null, imagePreview: null,
});

// ── Profile dropdown ───────────────────────────────────────────────────────
function ProfileMenu({ email, storeName, onLogout }: { email?: string; storeName: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "password" | "contact">("menu");
  const [phone, setPhone] = useState("");
  const [newEmail, setNewEmail] = useState(email ?? "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setView("menu");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initial = (storeName || email || "S").charAt(0).toUpperCase();

  const handleChangePassword = async () => {
    if (!newPw || newPw !== confirmPw) { setMsg("Passwords don't match."); return; }
    if (newPw.length < 6) { setMsg("Password must be at least 6 characters."); return; }
    setSaving(true);
    setMsg("");
    try {
      const session = getStoredAuthSession();
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "") ?? "";
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || "";
      const res = await fetch(`${url}/auth/v1/user`, {
        method: "PUT",
        headers: { apikey: anonKey, Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPw }),
      });
      if (res.ok) {
        setMsg("Password updated.");
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
      } else {
        const d = await res.json();
        setMsg(d?.message ?? "Could not update password.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setView("menu"); setMsg(""); }}
        className="flex h-9 items-center gap-1.5 rounded-full border border-black/10 bg-white pl-1 pr-3 shadow-sm"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white text-xs font-black">
          {initial}
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-black/40" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-black/10 bg-white shadow-xl">
          {view === "menu" && (
            <div className="p-2">
              {/* Profile header */}
              <div className="flex items-center gap-3 rounded-xl bg-black/4 px-3 py-2.5 mb-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white text-sm font-black">
                  {initial}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-black">{storeName}</div>
                  <div className="truncate text-xs font-bold text-black/40">{email}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setView("password")}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-black hover:bg-black/4"
              >
                <KeyRound className="h-4 w-4 text-black/40" />
                Change password
              </button>
              <button
                type="button"
                onClick={() => setView("contact")}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-black hover:bg-black/4"
              >
                <Phone className="h-4 w-4 text-black/40" />
                Contact details
              </button>

              <div className="my-2 border-t border-black/8" />

              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}

          {view === "password" && (
            <div className="p-4 grid gap-3">
              <div className="flex items-center gap-2 mb-1">
                <button type="button" onClick={() => { setView("menu"); setMsg(""); }} className="text-black/40 hover:text-black">
                  ←
                </button>
                <span className="text-sm font-black">Change password</span>
              </div>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="New password"
                className="h-11 rounded-xl border border-black/10 bg-black/4 px-3 text-sm font-bold outline-none focus:border-black"
              />
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Confirm new password"
                className="h-11 rounded-xl border border-black/10 bg-black/4 px-3 text-sm font-bold outline-none focus:border-black"
              />
              {msg && <p className={`text-xs font-bold ${msg.includes("updated") ? "text-green-600" : "text-red-500"}`}>{msg}</p>}
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={saving}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save new password
              </button>
            </div>
          )}

          {view === "contact" && (
            <div className="p-4 grid gap-3">
              <div className="flex items-center gap-2 mb-1">
                <button type="button" onClick={() => { setView("menu"); setMsg(""); }} className="text-black/40 hover:text-black">
                  ←
                </button>
                <span className="text-sm font-black">Contact details</span>
              </div>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-black/4 px-3">
                <Mail className="h-4 w-4 shrink-0 text-black/30" />
                <span className="text-sm font-bold text-black/60 truncate">{email}</span>
              </div>
              <div className="flex h-11 items-center overflow-hidden rounded-xl border border-black/10 bg-black/4 focus-within:border-black">
                <Phone className="ml-3 h-4 w-4 shrink-0 text-black/30" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone / WhatsApp number"
                  className="h-full flex-1 bg-transparent px-2 text-sm font-bold outline-none"
                />
              </div>
              {msg && <p className={`text-xs font-bold ${msg.includes("saved") ? "text-green-600" : "text-red-500"}`}>{msg}</p>}
              <button
                type="button"
                onClick={() => setMsg("Contact details saved.")}
                className="flex h-11 items-center justify-center rounded-xl bg-black text-sm font-black text-white"
              >
                Save
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────
// ── Full profile page (community users / admin without a store) ───────────────
type TryOnItem = { id: string; imageUrl: string; lookName: string; storeName: string; createdAt: string };

function ProfilePage({ isAdmin, userEmail, userInitial, accessToken, onLogout }: {
  isAdmin: boolean; userEmail: string; userInitial: string; accessToken: string; onLogout: () => void;
}) {
  const [alias, setAlias] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [callmebotKey, setCallmebotKey] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [credits, setCredits] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");
  const [tryOns, setTryOns] = useState<TryOnItem[]>([]);
  const [tryOnsLoading, setTryOnsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [userSlug, setUserSlug] = useState("");
  const [storeSlug, setStoreSlug] = useState<string | null>(null); // null=loading, ""=no store
  const [newStoreName, setNewStoreName] = useState("");
  const [creatingStore, setCreatingStore] = useState(false);
  const [storeErr, setStoreErr] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  type InboxMessage = { id: string; fromName: string; fromUsername: string; text: string; createdAt: string; readAt?: string };
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Load user profile + credits + try-ons
  useEffect(() => {
    const s = getStoredAuthSession();
    if (!s) return;
    // Credits
    fetch("/api/gallery", { headers: { "x-shopcut-account-id": `user-${s.user.id}` } })
      .then(r => r.json())
      .then((p: any) => { if (typeof p.credits === "number") setCredits(p.credits); })
      .catch(() => {});
    // Messages inbox
    setMessagesLoading(true);
    fetch("/api/messages", { headers: { Authorization: `Bearer ${s.access_token}` } })
      .then(r => r.json())
      .then((p: any) => setMessages((p.messages ?? []) as InboxMessage[]))
      .catch(() => {})
      .finally(() => setMessagesLoading(false));
    // Full profile (username, phone, address, bio, website, etc.)
    getAuthUser(s.access_token).then(u => {
      setAlias(u.user_metadata?.username ?? u.user_metadata?.full_name ?? "");
      setPhone(u.user_metadata?.phone ?? "");
      setAddress(u.user_metadata?.address ?? "");
      setBio(u.user_metadata?.bio ?? "");
      setWebsite(u.user_metadata?.website ?? "");
      setInstagram(u.user_metadata?.instagram ?? "");
      setNotificationEmail(u.user_metadata?.notification_email ?? "");
      setWhatsappNumber(u.user_metadata?.whatsapp_number ?? "");
      setCallmebotKey(u.user_metadata?.callmebot_key ?? "");
      setAvatarUrl(u.user_metadata?.avatar_url ?? "");
      const slug = (u.user_metadata?.username ?? u.user_metadata?.full_name ?? "")
        .trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      setUserSlug(slug);
      if (slug) {
        setTryOnsLoading(true);
        fetch(`/api/try-this-look?username=${encodeURIComponent(slug)}`)
          .then(r => r.json())
          .then((p: any) => setTryOns((p.userGallery ?? []) as TryOnItem[]))
          .catch(() => {})
          .finally(() => setTryOnsLoading(false));
      }
    }).catch(() => {});
    // Check if they already have a store
    fetch("/api/seller/me", { headers: { Authorization: `Bearer ${s.access_token}` } })
      .then(r => r.json())
      .then((p: any) => setStoreSlug(p.store?.slug ?? ""))
      .catch(() => setStoreSlug(""));
  }, []);

  const handleSave = async () => {
    setSaveErr(""); setSaveMsg(""); setSaving(true);
    try {
      if (newPw && newPw !== confirmPw) throw new Error("Passwords do not match.");
      if (newPw && newPw.length < 6) throw new Error("Password must be at least 6 characters.");
      await updateUserProfile(accessToken, {
        displayName: alias.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        bio: bio.trim() || undefined,
        website: website.trim() || undefined,
        instagram: instagram.trim().replace(/^@/, "") || undefined,
        notificationEmail: notificationEmail.trim() || undefined,
        whatsappNumber: whatsappNumber.trim() || undefined,
        callmebotKey: callmebotKey.trim() || undefined,
        newPassword: newPw || undefined,
      });
      setSaveMsg("Saved!");
      setNewPw(""); setConfirmPw("");
      // Reload try-ons if alias changed
      const newSlug = alias.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      if (newSlug && newSlug !== userSlug) {
        setUserSlug(newSlug);
        setTryOnsLoading(true);
        fetch(`/api/try-this-look?username=${encodeURIComponent(newSlug)}`)
          .then(r => r.json())
          .then((p: any) => setTryOns((p.userGallery ?? []) as TryOnItem[]))
          .catch(() => {})
          .finally(() => setTryOnsLoading(false));
      }
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "Error saving.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) return;
    setCreatingStore(true); setStoreErr("");
    try {
      const res = await fetch("/api/try-this-look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-own-store", storeName: newStoreName.trim(), accessToken }),
      });
      const p = await res.json();
      if (!res.ok) throw new Error(p.error ?? "Error creating store.");
      setStoreSlug(p.store?.slug ?? "");
      window.location.href = "/seller/dashboard";
    } catch (e) {
      setStoreErr(e instanceof Error ? e.message : "Error.");
    } finally {
      setCreatingStore(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((res, rej) => {
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const r = await fetch("/api/try-this-look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upload-avatar", accessToken, dataUrl }),
      });
      const p = await r.json();
      if (!r.ok) throw new Error(p.error ?? "Upload failed.");
      setAvatarUrl(p.avatarUrl);
    } catch { /**/ } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleDeleteTryOn = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch("/api/try-this-look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-own-generation", id, accessToken }),
      });
      if (!res.ok) throw new Error("Delete failed.");
      setTryOns(prev => prev.filter(t => t.id !== id));
    } catch { /**/ } finally {
      setDeletingId(null);
    }
  };

  const field = "h-11 w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 text-sm font-bold text-black placeholder:text-black/30 outline-none focus:border-black";

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      <header className="sticky top-0 z-20 border-b border-black/8 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <a href="/" className="grid h-8 w-8 place-items-center rounded-full border border-black/10 text-black/40">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>
          </a>
          <span className="text-sm font-black text-black">My Account</span>
          <button type="button" onClick={onLogout} className="flex items-center gap-1 text-xs font-bold text-black/40 hover:text-black transition">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 pb-20 grid gap-4">

        {/* Identity */}
        <section className="rounded-2xl border border-black/8 bg-white p-4 flex items-center gap-4">
          {/* Avatar with upload */}
          <button type="button" onClick={() => avatarInputRef.current?.click()}
            className="relative h-16 w-16 shrink-0 rounded-full overflow-hidden bg-black group">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-xl font-black text-white">{userInitial}</span>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              {avatarUploading ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <ImagePlus className="h-5 w-5 text-white" />}
            </div>
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-black">{userEmail}</p>
            <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${isAdmin ? "bg-violet-100 text-violet-700" : "bg-black/8 text-black/50"}`}>
              {isAdmin ? "Admin" : "Community"}
            </span>
          </div>
          {credits !== null && (
            <div className="shrink-0 text-right">
              <div className="text-lg font-black text-black">{credits}</div>
              <div className="text-[10px] font-bold text-black/40">credits</div>
            </div>
          )}
        </section>

        {/* Buy credits */}
        {!isAdmin && (
          <a href={`https://buy.stripe.com/test_6oUcMX9ktesv3SE4xZ8Vi00?prefilled_email=${encodeURIComponent(userEmail)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-black text-sm font-black text-white active:scale-95 transition-transform">
            <Sparkles className="h-4 w-4" /> Buy 10 try-on credits
          </a>
        )}

        {/* Admin links */}
        {isAdmin && (
          <section className="rounded-2xl border border-black/8 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-black/6">
              <p className="text-xs font-black uppercase tracking-widest text-black/30">Admin</p>
            </div>
            {[
              { label: "Looks & stores", href: "/admin/looks" },
              { label: "Users", href: "/admin/users" },
              { label: "Sellers", href: "/admin/sellers" },
              { label: "Admin overview", href: "/admin" },
            ].map(({ label, href }) => (
              <a key={href} href={href} className="flex h-11 items-center justify-between px-4 border-b border-black/5 last:border-0 text-sm font-bold text-black hover:bg-black/[0.02] transition">
                {label} <span className="text-black/30">→</span>
              </a>
            ))}
          </section>
        )}

        {/* Profile editing */}
        <section className="rounded-2xl border border-black/8 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-black/6">
            <p className="text-xs font-black uppercase tracking-widest text-black/30">Profile</p>
          </div>
          <div className="p-4 grid gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">Name / Alias</label>
              <input type="text" value={alias} onChange={e => setAlias(e.target.value)} placeholder="How you appear in the community" maxLength={40} className={field} />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="A short intro about yourself…" maxLength={200} rows={3}
                className="w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm font-bold text-black placeholder:text-black/30 outline-none focus:border-black resize-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">Website</label>
              <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yoursite.com" className={field} />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">Instagram</label>
              <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@yourhandle" maxLength={40} className={field} />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+43 …" className={field} />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">Address</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, City, Country" className={field} />
            </div>
          </div>
        </section>

        {/* Notifications (private) */}
        <section className="rounded-2xl border border-black/8 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-black/6">
            <p className="text-xs font-black uppercase tracking-widest text-black/30">Notifications</p>
            <p className="mt-0.5 text-[11px] text-black/40">Private — never shown publicly</p>
          </div>
          <div className="p-4 grid gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">Notification email</label>
              <input type="email" value={notificationEmail} onChange={e => setNotificationEmail(e.target.value)} placeholder="Receive message alerts here" className={field} />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">WhatsApp number</label>
              <input type="tel" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="+43 … (international format)" className={field} />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">CallMeBot API key</label>
              <input type="text" value={callmebotKey} onChange={e => setCallmebotKey(e.target.value)} placeholder="From callmebot.com/whatsapp.php" className={field} />
              <p className="mt-1 text-[10px] text-black/35">Register at callmebot.com to get your key — then WhatsApp messages arrive instantly.</p>
            </div>
          </div>
        </section>

        {/* Password change */}
        <section className="rounded-2xl border border-black/8 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-black/6">
            <p className="text-xs font-black uppercase tracking-widest text-black/30">Change password</p>
          </div>
          <div className="p-4 grid gap-3">
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password" autoComplete="new-password" className={field} />
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm new password" autoComplete="new-password" className={field} />
          </div>
        </section>

        {saveErr && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{saveErr}</p>}
        {saveMsg && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{saveMsg}</p>}

        <button type="button" onClick={handleSave} disabled={saving}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-black text-sm font-black text-white disabled:opacity-40 active:scale-95 transition-transform">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
        </button>

        {/* Looks / Store section */}
        <section className="rounded-2xl border border-black/8 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-black/6 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-widest text-black/30">My looks</p>
            {storeSlug && (
              <a href="/seller/dashboard" className="text-xs font-black text-black underline underline-offset-2">Manage store →</a>
            )}
          </div>
          {storeSlug === null ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-black/20" /></div>
          ) : storeSlug ? (
            <div className="px-4 py-5 text-center grid gap-3">
              <p className="text-sm font-bold text-black/50">Your store is live at</p>
              <a href={`/store/${storeSlug}`} target="_blank" rel="noopener noreferrer"
                className="text-sm font-black text-black underline underline-offset-2">
                luxurybandit.com/store/{storeSlug}
              </a>
              <a href="/seller/dashboard"
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white active:scale-95 transition-transform">
                Open seller dashboard →
              </a>
            </div>
          ) : (
            <div className="p-4 grid gap-3">
              <p className="text-sm font-bold text-black/50">You don't have a store yet. Create one to start selling.</p>
              <input type="text" value={newStoreName} onChange={e => setNewStoreName(e.target.value)}
                placeholder="Shop name (e.g. Szidi Vintage)"
                className="h-11 w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 text-sm font-bold text-black placeholder:text-black/30 outline-none focus:border-black" />
              {storeErr && <p className="text-xs font-bold text-red-500">{storeErr}</p>}
              <button type="button" onClick={handleCreateStore} disabled={creatingStore || !newStoreName.trim()}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white disabled:opacity-40 active:scale-95 transition-transform">
                {creatingStore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create my store →"}
              </button>
            </div>
          )}
        </section>

        {/* Messages link */}
        <a href="/messages"
          className="flex h-12 items-center justify-between rounded-2xl border border-black/8 bg-white px-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-black/40" />
            <span className="text-sm font-black text-black">Messages</span>
          </div>
          {messages.filter(m => !m.readAt).length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1.5 text-[10px] font-black text-white">
              {messages.filter(m => !m.readAt).length}
            </span>
          )}
          {messages.filter(m => !m.readAt).length === 0 && (
            <span className="text-sm text-black/30">→</span>
          )}
        </a>

        {/* Try-on gallery */}
        <section className="rounded-2xl border border-black/8 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-black/6 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-widest text-black/30">My try-ons</p>
            {tryOns.length > 0 && <span className="text-xs font-black text-black/40">{tryOns.length}</span>}
          </div>
          {tryOnsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-black/20" /></div>
          ) : !userSlug ? (
            <p className="px-4 py-6 text-center text-sm font-bold text-black/30">Set a name/alias above to see your try-ons.</p>
          ) : tryOns.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm font-bold text-black/30">No try-ons yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-px bg-black/8">
              {tryOns.map(t => (
                <div key={t.id} className="relative aspect-[3/4] bg-black/5 overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.imageUrl} alt={t.lookName} className="h-full w-full object-cover object-top" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                  <button
                    type="button"
                    onClick={() => void handleDeleteTryOn(t.id)}
                    disabled={deletingId === t.id}
                    className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] font-black text-white truncate">{t.lookName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <button type="button" onClick={onLogout}
          className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white text-sm font-bold text-black/50">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </main>
    </div>
  );
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<SellerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [requestingAi, setRequestingAi] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Store profile editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", address: "", description: "", instagram: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const [session, setSession] = useState<ReturnType<typeof getStoredAuthSession>>(null);

  useEffect(() => {
    const s = getStoredAuthSession();
    if (!s?.access_token) { router.push("/seller/login"); return; }
    setSession(s);
    loadData(s.access_token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const authHeader = (token?: string) => ({ Authorization: `Bearer ${token ?? session?.access_token ?? ""}` });

  const loadData = async (token?: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/seller/me", { headers: authHeader(token) });
      if (res.status === 401) { router.push("/seller/login"); return; }
      const payload = await res.json();
      if (!res.ok) { setError(payload.error ?? "Could not load data."); return; }
      setData(payload);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  };

  const handleImageChange = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setForm((f) => ({ ...f, imageFile: file, imagePreview: e.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const openCreateForm = () => { setEditId(null); setForm(emptyForm()); setShowForm(true); };

  const openEditForm = (look: Look) => {
    setEditId(look.id);
    setForm({ name: look.name, price: look.price ?? "", salePrice: look.salePrice ?? "",
      productNote: look.productNote ?? "", hashtags: look.hashtags ?? "",
      inStock: look.inStock !== false, imageFile: null, imagePreview: look.imageUrl ?? null });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Listing name is required."); return; }
    setSaving(true); setError("");
    try {
      const fd = new FormData();
      fd.append("action", editId ? "update-look" : "upload-look");
      if (editId) fd.append("id", editId);
      fd.append("name", form.name);
      fd.append("price", form.price);
      fd.append("salePrice", form.salePrice);
      fd.append("productNote", form.productNote);
      fd.append("hashtags", form.hashtags);
      fd.append("inStock", String(form.inStock));
      if (form.imageFile) fd.append("image", form.imageFile);
      const res = await fetch("/api/seller/action", { method: "POST", headers: authHeader(), body: fd });
      const payload = await res.json();
      if (!res.ok) { setError(payload.error ?? "Could not save."); return; }
      setMessage(editId ? "Listing updated." : "Listing created.");
      setShowForm(false);
      await loadData();
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    setDeleting(id);
    try {
      const fd = new FormData();
      fd.append("action", "delete-look");
      fd.append("id", id);
      await fetch("/api/seller/action", { method: "POST", headers: authHeader(), body: fd });
      await loadData();
    } finally { setDeleting(null); }
  };

  const requestAiAccess = async () => {
    setRequestingAi(true);
    try {
      const fd = new FormData();
      fd.append("action", "request-ai-access");
      const res = await fetch("/api/seller/action", { method: "POST", headers: authHeader(), body: fd });
      const payload = await res.json();
      if (res.ok) { setMessage("AI access request sent! We'll get back to you soon."); await loadData(); }
      else setError(payload.error ?? "Could not send request.");
    } finally { setRequestingAi(false); }
  };

  const handleLogout = () => { signOut(); router.push("/seller/login"); };

  const openEditProfile = () => {
    const s = data?.store;
    setProfileForm({ name: s?.name ?? "", address: s?.address ?? "", description: s?.description ?? "", instagram: s?.instagram ?? "" });
    setEditingProfile(true);
  };

  const saveProfile = async () => {
    setSavingProfile(true); setError(""); setMessage("");
    try {
      const fd = new FormData();
      fd.append("action", "update-store");
      fd.append("name", profileForm.name);
      fd.append("address", profileForm.address);
      fd.append("description", profileForm.description);
      fd.append("instagram", profileForm.instagram);
      const res = await fetch("/api/seller/action", { method: "POST", headers: authHeader(), body: fd });
      const payload = await res.json();
      if (!res.ok) { setError(payload.error ?? "Could not save."); return; }
      setMessage("Store profile updated.");
      setEditingProfile(false);
      await loadData();
    } catch { setError("Network error."); }
    finally { setSavingProfile(false); }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafaf8]">
        <Loader2 className="h-6 w-6 animate-spin text-black/30" />
      </div>
    );
  }

  // No store linked — show full profile page for community users / admin
  if (!data?.store && error) {
    const isAdmin = session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const userEmail = session?.user?.email ?? "";
    const userInitial = userEmail[0]?.toUpperCase() ?? "U";
    return <ProfilePage
      isAdmin={isAdmin}
      userEmail={userEmail}
      userInitial={userInitial}
      accessToken={session?.access_token ?? ""}
      onLogout={handleLogout}
    />;
  }

  const store = data?.store;
  const looks = data?.looks ?? [];
  const aiUsed = store?.aiCreditsUsed ?? 0;
  const aiLimit = store?.aiCreditsLimit ?? 0;
  const aiEnabled = store?.aiEnabled ?? false;
  const pendingAiRequest = store?.pendingAiRequest ?? false;

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-black/8 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="grid h-8 w-8 place-items-center rounded-full border border-black/10 text-black/40 hover:text-black transition" title="Back to LuxuryBandit">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>
            </a>
            <div>
              <div className="text-sm font-black text-black leading-none">{store?.name ?? "My Store"}</div>
              <div className="text-[11px] font-bold text-black/40">/store/{store?.slug}</div>
            </div>
          </div>
          <ProfileMenu
            email={session?.user?.email}
            storeName={store?.name ?? ""}
            onLogout={handleLogout}
          />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 grid gap-5">
        {/* Messages */}
        {error && (
          <div className="flex items-start justify-between rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {error}
            <button type="button" onClick={() => setError("")}><X className="h-4 w-4" /></button>
          </div>
        )}
        {message && (
          <div className="flex items-start justify-between rounded-xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{message}</span>
            <button type="button" onClick={() => setMessage("")}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Store profile */}
        <section className="rounded-2xl border border-black/8 bg-white p-4">
          {!editingProfile ? (
            <>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-sm font-black text-black">{store?.name}</div>
                  <a href={`/store/${store?.slug}`} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] font-bold text-cobalt hover:underline">
                    luxurybandit.com/store/{store?.slug}
                  </a>
                </div>
                <button type="button" onClick={openEditProfile}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-black/10 px-3 text-xs font-black text-black/60 hover:text-black transition">
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              </div>
              <div className="grid gap-1.5 text-xs font-bold text-black/50">
                {store?.address && <div className="flex items-start gap-2"><span className="shrink-0 font-black text-black/30">Address</span>{store.address}</div>}
                {store?.description && <div className="flex items-start gap-2"><span className="shrink-0 font-black text-black/30">About</span>{store.description}</div>}
                {store?.instagram && <div className="flex items-start gap-2"><span className="shrink-0 font-black text-black/30">Instagram</span>@{store.instagram}</div>}
                {!store?.address && !store?.description && !store?.instagram && (
                  <div className="text-black/30">No profile info yet — tap Edit to add.</div>
                )}
              </div>
            </>
          ) : (
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-black">Edit store profile</span>
                <button type="button" onClick={() => setEditingProfile(false)}><X className="h-4 w-4 text-black/30" /></button>
              </div>
              {[
                { label: "Store name", key: "name", placeholder: "Your store name" },
                { label: "Address", key: "address", placeholder: "Street, City" },
                { label: "Instagram", key: "instagram", placeholder: "@yourhandle" },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="grid gap-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black/40">{label}</label>
                  <input
                    type="text"
                    value={profileForm[key as keyof typeof profileForm]}
                    onChange={e => setProfileForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="h-10 rounded-xl border border-black/10 bg-[#fafaf8] px-3 text-sm font-bold text-black outline-none focus:border-black"
                  />
                </div>
              ))}
              <div className="grid gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-black/40">About / Description</label>
                <textarea
                  rows={3}
                  value={profileForm.description}
                  onChange={e => setProfileForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Short description of your store"
                  className="rounded-xl border border-black/10 bg-[#fafaf8] px-3 py-2 text-sm font-bold text-black outline-none focus:border-black resize-none"
                />
              </div>
              <button type="button" onClick={saveProfile} disabled={savingProfile}
                className="flex h-10 items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white disabled:opacity-60">
                {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingProfile ? "Saving…" : "Save profile"}
              </button>
            </div>
          )}
        </section>

        {/* AI Credit box */}
        <section className="rounded-2xl border border-black/8 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-black flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                LuxbanditFit — AI image generation
              </div>
              {aiEnabled ? (
                <div className="mt-1 text-xs font-bold text-black/50">
                  <span className="font-black text-black">{aiUsed}</span> / {aiLimit} credits used this month
                </div>
              ) : (
                <div className="mt-1 text-xs font-bold text-black/50">
                  Generate AI model photos for your listings
                </div>
              )}
            </div>
            {aiEnabled ? (
              <div className="flex h-7 items-center rounded-full bg-violet-100 px-3 text-[11px] font-black text-violet-700">Active</div>
            ) : pendingAiRequest ? (
              <div className="flex h-7 items-center rounded-full bg-amber-100 px-3 text-[11px] font-black text-amber-700">Pending review</div>
            ) : (
              <button type="button" onClick={requestAiAccess} disabled={requestingAi}
                className="flex h-8 items-center gap-1.5 rounded-xl bg-black px-3 text-xs font-black text-white disabled:opacity-60">
                {requestingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                Request access
              </button>
            )}
          </div>
          {aiEnabled && aiLimit > 0 && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/8">
              <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${Math.min(100, (aiUsed / aiLimit) * 100)}%` }} />
            </div>
          )}
          {aiEnabled && aiUsed >= aiLimit && aiLimit > 0 && (
            <p className="mt-2 text-xs font-bold text-amber-600">Credits used up — contact us for more.</p>
          )}
        </section>

        {/* Listings */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-black text-black">
              My Listings <span className="text-black/30">({looks.length})</span>
            </h2>
            <button type="button" onClick={openCreateForm}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-black px-4 text-xs font-black text-white">
              <Plus className="h-3.5 w-3.5" /> Add listing
            </button>
          </div>

          {looks.length === 0 && !showForm && (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-black/15 py-14 px-6 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-black/5 text-3xl">🛍️</div>
              <div>
                <p className="text-base font-black text-black">Du hast noch keine eigenen Produkte</p>
                <p className="mt-1 text-sm font-bold text-black/40 max-w-xs mx-auto leading-relaxed">
                  Fang an deine Produkte hier zu verkaufen und werde ein Creator auf LuxuryBandit.
                </p>
              </div>
              <button type="button" onClick={openCreateForm}
                className="flex h-12 items-center gap-2 rounded-xl bg-black px-6 text-sm font-black text-white active:scale-95 transition-transform">
                <Plus className="h-4 w-4" /> Erstes Produkt erstellen
              </button>
            </div>
          )}

          {/* Listing form */}
          {showForm && (
            <div className="mb-4 rounded-2xl border border-black/10 bg-white p-4 grid gap-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-black">{editId ? "Edit listing" : "New listing"}</div>
                <button type="button" onClick={() => setShowForm(false)}><X className="h-4 w-4 text-black/40" /></button>
              </div>

              {/* Image upload */}
              <div
                className="relative flex h-36 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-black/15 bg-black/3 hover:bg-black/5 transition"
                onClick={() => fileRef.current?.click()}
              >
                {form.imagePreview ? (
                  <Image src={form.imagePreview} alt="preview" fill className="object-cover object-top" />
                ) : (
                  <div className="text-center">
                    <ImagePlus className="mx-auto h-6 w-6 text-black/25" />
                    <p className="mt-1 text-xs font-bold text-black/35">Tap to upload photo</p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)} />
              </div>

              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Listing title *"
                className="h-11 rounded-xl border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-black" />

              <div className="grid grid-cols-2 gap-2">
                {(["price", "salePrice"] as const).map((field) => (
                  <div key={field} className="flex h-11 items-center overflow-hidden rounded-xl border border-black/10 bg-panel focus-within:border-black">
                    <input
                      value={form[field].replace(/\s*(eur|€)/i, "").trim()}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                      onBlur={(e) => { const v = e.target.value.trim(); if (v && !/eur|€/i.test(v)) setForm((f) => ({ ...f, [field]: v + " EUR" })); }}
                      placeholder={field === "price" ? "Price" : "Sale price"}
                      className="h-full flex-1 bg-transparent px-3 text-sm font-bold outline-none"
                    />
                    <span className="border-l border-black/10 px-2 text-xs font-black text-black/40">EUR</span>
                  </div>
                ))}
              </div>

              <textarea value={form.productNote} onChange={(e) => setForm((f) => ({ ...f, productNote: e.target.value }))}
                placeholder="Description (optional)" rows={3}
                className="rounded-xl border border-black/10 bg-panel px-3 py-2.5 text-sm font-bold outline-none focus:border-black resize-none" />

              <input type="text" value={form.hashtags} onChange={(e) => setForm((f) => ({ ...f, hashtags: e.target.value }))}
                placeholder="#vintage #luxury #fashion"
                className="h-11 rounded-xl border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-black" />

              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`relative h-5 w-9 rounded-full transition ${form.inStock ? "bg-black" : "bg-black/20"}`}
                  onClick={() => setForm((f) => ({ ...f, inStock: !f.inStock }))}>
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${form.inStock ? "left-4" : "left-0.5"}`} />
                </div>
                <span className="text-xs font-black text-black/60">{form.inStock ? "Available" : "Sold out"}</span>
              </label>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={handleSave} disabled={saving}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white disabled:opacity-60">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? "Saving…" : editId ? "Save changes" : "Add listing"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="h-11 rounded-xl border border-black/10 px-4 text-sm font-black text-black/50">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Listings list */}
          <div className="grid gap-2">
            {looks.map((look) => (
              <div key={look.id} className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white p-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-black/5">
                  {look.imageUrl ? (
                    <Image src={look.imageUrl} alt={look.name} fill className="object-cover object-top" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg">🛍️</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black text-black">{look.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {(look.salePrice || look.price) && (
                      <span className="text-xs font-bold text-black/60">{look.salePrice ?? look.price}</span>
                    )}
                    <span className={`text-[10px] font-black uppercase tracking-wide ${look.published ? "text-green-600" : "text-black/30"}`}>
                      {look.published ? "Live" : "Draft"}
                    </span>
                    {look.inStock === false && (
                      <span className="text-[10px] font-black uppercase tracking-wide text-red-400">Sold</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => openEditForm(look)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-black/40 hover:text-black">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => handleDelete(look.id)} disabled={deleting === look.id}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-black/40 hover:text-red-500">
                    {deleting === look.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Store link */}
        {store?.slug && (
          <div className="rounded-2xl border border-black/8 bg-white p-4">
            <div className="text-xs font-black uppercase tracking-widest text-black/40 mb-1">Your store link</div>
            <a href={`/store/${store.slug}`} target="_blank" rel="noopener noreferrer"
              className="text-sm font-black text-black underline underline-offset-2">
              luxurybandit.com/store/{store.slug}
            </a>
            <p className="mt-1 text-xs font-bold text-black/40">
              Listings marked as Live are visible to buyers. Drafts are only visible to you.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
