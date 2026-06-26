"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, Trash2, Power, PlayCircle, Users, LayoutGrid, ExternalLink, X, Sparkles, Pencil, Clock, ArrowUp, ArrowDown, LogOut, LogIn, Inbox, MessageCircle, Send } from "lucide-react";
import { signInWithPassword, getStoredAuthSession, saveAuthSession, signOut, resetPassword } from "@/lib/supabase-auth-client";
import { isAdminEmail } from "@/lib/is-admin-email";

const ADMIN_PIN_KEY = "luxurybandit-try-look-admin-pin";

type Curator = {
  id: string;
  firstName?: string; lastName?: string; email?: string;
  phone?: string; address?: string; instagram?: string;
  brands?: string; style?: string; genderFocus?: string; ageFocus?: string;
  colors?: string; fabrics?: string; occasions?: string; priceTiers?: string; fitFocus?: string;
  motto?: string; bio?: string;
  status?: "active" | "pending" | "deactivated";
  photoUrl?: string; credits?: number; creditsSpent?: number; createdAt?: string;
};

type Look = {
  id: string; name: string; published?: boolean;
  frontImageUrl?: string; imageUrl?: string; videoUrl?: string;
  curatorName?: string; curatorId?: string;
  price?: string; salePrice?: string; buyUrl?: string;
  brand?: string; productNote?: string; storeName?: string;
  aiCreated?: boolean; createdAt?: string; videoCreatedAt?: string;
  alternatives?: unknown[];
};

// Same ordering key the public "The A List" uses: most recent activity first —
// a fresh video beats the publish date.
const lookWhen = (l: Look) => {
  const v = l.videoCreatedAt ?? "";
  const c = l.createdAt ?? "";
  return v > c ? v : c;
};

const slugify = (s?: string) => (s ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
type Msg = { id: string; text: string; createdAt: string; readAt?: string; fromUserId: string; fromName?: string; fromEmail?: string; toUserId: string; toName?: string; toIsCurator?: boolean };
type Cmt = { id: string; lookId: string; text: string; authorName?: string; createdAt: string; lookName?: string; curatorId?: string; curatorName?: string };

const fullName = (c: Curator) => [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || "—";
const initials = (c: Curator) => (`${c.firstName?.[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase() || "?");
const fmtDate = (s?: string) => { if (!s) return ""; try { return new Date(s).toLocaleDateString(); } catch { return ""; } };
// Exact timestamp: date + HH:MM:SS, e.g. "25.06.2026, 14:32:07".
const fmtTs = (s?: string) => {
  if (!s) return "";
  try {
    return new Date(s).toLocaleString(undefined, {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch { return ""; }
};

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [token, setToken] = useState(""); // Supabase admin access token
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gateMode, setGateMode] = useState<"login" | "pin">("login");
  const [note, setNote] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<"looks" | "curators" | "inbox">("looks");
  const [inboxTab, setInboxTab] = useState<"comments" | "messages">("comments");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [comments, setComments] = useState<Cmt[]>([]);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState("");
  const [curators, setCurators] = useState<Curator[]>([]);
  const [looks, setLooks] = useState<Look[]>([]);
  const [community, setCommunity] = useState<{ customerName?: string; curatorId?: string }[]>([]);
  const [sortC, setSortC] = useState<"looks" | "tryons" | "name">("looks");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const pickSort = (key: "looks" | "tryons" | "name") => {
    if (sortC === key) setSortDir(d => (d === "desc" ? "asc" : "desc"));
    else { setSortC(key); setSortDir("desc"); }
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [confirmId, setConfirmId] = useState("");
  const [edit, setEdit] = useState<Curator | null>(null); // curator being edited
  const [editLook, setEditLook] = useState<Look | null>(null); // listing being edited
  const [creditsDraft, setCreditsDraft] = useState(""); // credits input in curator sheet
  const [saving, setSaving] = useState(false);

  const headers = (p = pin, t = token): Record<string, string> => ({
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...(p ? { "x-try-look-admin-pin": p } : {}),
  });

  const armOrRun = (id: string, run: () => void) => {
    if (confirmId === id) { setConfirmId(""); run(); }
    else { setConfirmId(id); setTimeout(() => setConfirmId(c => (c === id ? "" : c)), 3500); }
  };

  const load = async (p = pin, t = token) => {
    if (!p && !t) return;
    setLoading(true); setError("");
    try {
      const [cr, lr, com, msg, cmt] = await Promise.all([
        fetch("/api/try-this-look?curators=1", { headers: headers(p, t) }),
        fetch("/api/try-this-look?admin=1", { headers: headers(p, t) }),
        fetch("/api/try-this-look?community=1"),
        fetch("/api/messages?all=1", { headers: headers(p, t) }),
        fetch("/api/try-this-look?allComments=1", { headers: headers(p, t) }),
      ]);
      if (cr.status === 401 || lr.status === 401) { setError("Wrong PIN."); setAuthed(false); setLoading(false); return; }
      const cd = await cr.json().catch(() => ({}));
      const ld = await lr.json().catch(() => ({}));
      const comd = await com.json().catch(() => ({}));
      const msgd = await msg.json().catch(() => ({}));
      const cmtd = await cmt.json().catch(() => ({}));
      setCurators(Array.isArray(cd.curators) ? cd.curators : []);
      setLooks(Array.isArray(ld.looks) ? ld.looks : []);
      setCommunity(Array.isArray(comd.community) ? comd.community : []);
      setMessages(Array.isArray(msgd.messages) ? msgd.messages : []);
      setComments(Array.isArray(cmtd.comments) ? cmtd.comments : []);
      setAuthed(true);
    } catch { setError("Could not load admin data."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const session = getStoredAuthSession();
    if (session?.access_token && isAdminEmail(session.user?.email)) {
      setToken(session.access_token);
      void load("", session.access_token);
      return;
    }
    const stored = window.localStorage.getItem(ADMIN_PIN_KEY) ?? "";
    if (stored) { setPin(stored); setGateMode("pin"); void load(stored); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signInPin = () => { window.localStorage.setItem(ADMIN_PIN_KEY, pin); void load(pin, ""); };

  const signInEmail = async () => {
    setLoading(true); setError(""); setNote("");
    try {
      const session = await signInWithPassword(email.trim().toLowerCase(), password);
      if (!session?.access_token || !isAdminEmail(session.user?.email)) {
        signOut(); setError("This account is not an admin."); setLoading(false); return;
      }
      setToken(session.access_token);
      await load("", session.access_token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed."); setLoading(false);
    }
  };

  const logout = () => { signOut(); window.localStorage.removeItem(ADMIN_PIN_KEY); setToken(""); setPin(""); setAuthed(false); };

  const forgot = async () => {
    if (!email.trim()) { setError("Enter your email first."); return; }
    setNote(""); setError("");
    try { await resetPassword(email.trim().toLowerCase()); setNote("Password reset email sent."); }
    catch { setError("Could not send reset email."); }
  };

  const fail = async (r: Response, fallback: string) => {
    const d = await r.json().catch(() => ({}));
    setError(d?.error || `${fallback} (${r.status})`);
    setTimeout(() => setError(""), 4000);
  };

  // ── Curator actions ──
  const setCuratorStatus = async (id: string, status: "active" | "deactivated") => {
    setBusy(id); setError("");
    setCurators(cs => cs.map(c => c.id === id ? { ...c, status } : c));
    try {
      const r = await fetch("/api/curator", { method: "POST", headers: headers(), body: JSON.stringify({ action: "set-curator-status", id, status }) });
      if (!r.ok) { setCurators(cs => cs.map(c => c.id === id ? { ...c, status: status === "active" ? "deactivated" : "active" } : c)); await fail(r, "Could not update curator"); }
    } catch { setError("Network error."); }
    setBusy("");
  };
  const deleteCurator = async (id: string) => {
    setBusy(id); setError("");
    try {
      const r = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "delete-curator", id }) });
      if (r.ok) { setCurators(cs => cs.filter(c => c.id !== id)); setEdit(null); } else await fail(r, "Could not delete curator");
    } catch { setError("Network error."); }
    setBusy("");
  };
  const saveCurator = async () => {
    if (!edit) return;
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/curator", { method: "POST", headers: headers(), body: JSON.stringify({ action: "update", ...edit, id: edit.id }) });
      if (r.ok) { setCurators(cs => cs.map(c => c.id === edit.id ? { ...c, ...edit } : c)); setEdit(null); }
      else await fail(r, "Could not save curator");
    } catch { setError("Network error."); }
    setSaving(false);
  };

  // Impersonate a curator: set the local curator session so the Studio + try-on
  // run in their name (their x-curator-id → their credits & attribution). Opens
  // the Studio in a new tab; the admin session stays put in this tab.
  const loginAs = (c: Curator, where: "studio" | "messages" | "feed" | "profile" = "studio") => {
    if (c.id === "house") return;
    try {
      window.localStorage.setItem("lb_curator", JSON.stringify({ id: c.id, firstName: c.firstName ?? "", email: c.email ?? "", style: c.style ?? "" }));
    } catch { /* ignore */ }
    const url = where === "studio" ? "/admin/trends"
      : where === "messages" ? "/messages"
      : where === "feed" ? "/stores"
      : `/curator/${c.id}`;
    window.open(url, "_blank");
  };

  // ── Inbox replies ──
  // Reply to a comment AS the look's curator (authorName = their name).
  const replyComment = async (c: Cmt) => {
    const text = (reply[c.id] || "").trim(); if (!text) return;
    setSendingId(c.id); setError("");
    try {
      const r = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "add-comment", lookId: c.lookId, text, authorName: c.curatorName || "LuxuryBandit" }) });
      if (r.ok) {
        setComments(cs => [{ id: `r-${Date.now()}`, lookId: c.lookId, text, authorName: c.curatorName, createdAt: new Date().toISOString(), lookName: c.lookName, curatorId: c.curatorId, curatorName: c.curatorName }, ...cs]);
        setReply(m => ({ ...m, [c.id]: "" }));
      } else await fail(r, "Could not reply");
    } catch { setError("Network error."); }
    setSendingId("");
  };
  // Reply to a message AS the curator who received it → back to the sender.
  // NB: send ONLY x-curator-id (no admin token), else the message route would
  // resolve the admin as the sender instead of the curator.
  const replyMessage = async (m: Msg) => {
    const text = (reply[m.id] || "").trim(); if (!text) return;
    if (!m.toIsCurator) { setError("Can only reply as one of our curators."); return; }
    setSendingId(m.id); setError("");
    try {
      const r = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-curator-id": m.toUserId }, body: JSON.stringify({ toUserId: m.fromUserId, text }) });
      if (r.ok) {
        setMessages(ms => [{ id: `r-${Date.now()}`, text, createdAt: new Date().toISOString(), readAt: new Date().toISOString(), fromUserId: m.toUserId, fromName: m.toName, toUserId: m.fromUserId, toName: m.fromName, toIsCurator: false }, ...ms]);
        setReply(mm => ({ ...mm, [m.id]: "" }));
      } else await fail(r, "Could not send");
    } catch { setError("Network error."); }
    setSendingId("");
  };

  // ── Look actions ──
  const setLookPublished = async (id: string, published: boolean) => {
    setBusy(id); setError("");
    setLooks(ls => ls.map(l => l.id === id ? { ...l, published } : l));
    try {
      const r = await fetch("/api/curator", { method: "POST", headers: headers(), body: JSON.stringify({ action: "toggle-look", lookId: id, published }) });
      if (!r.ok) { setLooks(ls => ls.map(l => l.id === id ? { ...l, published: !published } : l)); await fail(r, "Could not update listing"); }
    } catch { setError("Network error."); }
    setBusy("");
  };
  const deleteLook = async (id: string) => {
    setBusy(id); setError("");
    try {
      const r = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "delete-look", id }) });
      if (r.ok) { setLooks(ls => ls.filter(l => l.id !== id)); setEditLook(null); } else await fail(r, "Could not delete listing");
    } catch { setError("Network error."); }
    setBusy("");
  };
  const saveLook = async () => {
    if (!editLook) return;
    setSaving(true); setError("");
    const patch = { name: editLook.name, price: editLook.price ?? "", salePrice: editLook.salePrice ?? "", productNote: editLook.productNote ?? "", storeName: editLook.storeName ?? "", buyUrl: editLook.buyUrl ?? "" };
    try {
      const r = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "update-look", id: editLook.id, ...patch }) });
      if (r.ok) { setLooks(ls => ls.map(l => l.id === editLook.id ? { ...l, ...patch } : l)); setEditLook(null); }
      else await fail(r, "Could not save listing");
    } catch { setError("Network error."); }
    setSaving(false);
  };

  // Curator credits (admin set-credits)
  const saveCredits = async () => {
    if (!edit) return;
    const n = Number(creditsDraft);
    if (!Number.isFinite(n)) { setError("Credits must be a number."); return; }
    setBusy(edit.id); setError("");
    try {
      const r = await fetch("/api/curator", { method: "POST", headers: headers(), body: JSON.stringify({ action: "set-credits", id: edit.id, credits: n }) });
      if (r.ok) { setCurators(cs => cs.map(c => c.id === edit.id ? { ...c, credits: n } : c)); setEdit(e => e && { ...e, credits: n }); }
      else await fail(r, "Could not set credits");
    } catch { setError("Network error."); }
    setBusy("");
  };

  const looksByCurator = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of looks) { const id = l.curatorId || "house"; m.set(id, (m.get(id) ?? 0) + 1); }
    return m;
  }, [looks]);

  // Try-ons per curator: match the community post's curatorId, else its customerName
  // slug to a curator's full name.
  const tryonsByCurator = useMemo(() => {
    const ids = new Set(curators.map(c => c.id));
    const slugToId = new Map(curators.map(c => [slugify(fullName(c)), c.id]));
    const m = new Map<string, number>();
    for (const item of community) {
      const id = (item.curatorId && ids.has(item.curatorId) ? item.curatorId : slugToId.get(slugify(item.customerName))) || "house";
      m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [community, curators]);

  // Synthetic "Admin (house)" creator: aggregates all looks/try-ons with no real
  // curator (admin-published, unassigned). Shown in the list, not editable.
  const houseCurator = useMemo<Curator>(() => ({ id: "house", firstName: "Admin", lastName: "· house", status: "active" }), []);
  const hasHouse = (looksByCurator.get("house") ?? 0) > 0 || (tryonsByCurator.get("house") ?? 0) > 0;

  const q = query.trim().toLowerCase();
  const shownCurators = useMemo(() => {
    const base = !q ? curators : curators.filter(c => `${fullName(c)} ${c.email ?? ""} ${c.brands ?? ""} ${c.style ?? ""}`.toLowerCase().includes(q));
    const arr = [...base];
    const dir = sortDir === "asc" ? 1 : -1; // desc by default: most / Z first
    if (sortC === "name") arr.sort((a, b) => fullName(a).localeCompare(fullName(b)) * dir);
    else if (sortC === "tryons") arr.sort((a, b) => ((tryonsByCurator.get(a.id) ?? 0) - (tryonsByCurator.get(b.id) ?? 0)) * dir);
    else arr.sort((a, b) => ((looksByCurator.get(a.id) ?? 0) - (looksByCurator.get(b.id) ?? 0)) * dir);
    // Admin/house entry pinned at the top (respects search).
    return hasHouse && (!q || "admin house".includes(q)) ? [houseCurator, ...arr] : arr;
  }, [curators, q, sortC, sortDir, looksByCurator, tryonsByCurator, hasHouse, houseCurator]);
  const shownLooks = useMemo(() => {
    const base = !q ? looks : looks.filter(l => `${l.name} ${l.curatorName ?? ""} ${l.brand ?? ""} ${l.productNote ?? ""}`.toLowerCase().includes(q));
    return [...base].sort((a, b) => lookWhen(b).localeCompare(lookWhen(a))); // newest activity first — matches the frontend A List
  }, [looks, q]);

  const liveLooks = looks.filter(l => l.published !== false).length;
  const activeCurators = curators.filter(c => c.status !== "deactivated").length;

  if (!authed) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#fbfaf7] px-4 text-ink">
        <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-soft">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-cobalt">LuxuryBandit</div>
          <h1 className="mt-1 text-2xl font-black">Admin</h1>

          {gateMode === "login" ? (
            <>
              <p className="mt-1 text-sm font-bold text-ink/50">Sign in with your admin email & password.</p>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" autoComplete="username"
                className="mt-4 h-12 w-full rounded-xl border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt" />
              <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" autoComplete="current-password"
                onKeyDown={e => { if (e.key === "Enter") void signInEmail(); }}
                className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt" />
              <button type="button" onClick={() => void signInEmail()} disabled={loading} className="mt-3 h-12 w-full rounded-xl bg-black text-sm font-black text-white active:scale-95 transition disabled:opacity-50">
                {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Sign in"}
              </button>
              <div className="mt-3 flex items-center justify-between text-[11px] font-black">
                <button type="button" onClick={() => void forgot()} className="text-ink/45 underline">Forgot password</button>
                <button type="button" onClick={() => { setGateMode("pin"); setError(""); }} className="text-ink/45 underline">Use admin PIN</button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm font-bold text-ink/50">Enter the admin PIN.</p>
              <input value={pin} onChange={e => setPin(e.target.value)} type="password" placeholder="Admin PIN"
                onKeyDown={e => { if (e.key === "Enter") signInPin(); }}
                className="mt-4 h-12 w-full rounded-xl border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt" />
              <button type="button" onClick={signInPin} className="mt-3 h-12 w-full rounded-xl bg-black text-sm font-black text-white active:scale-95 transition">
                {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Enter"}
              </button>
              <div className="mt-3 text-right text-[11px] font-black">
                <button type="button" onClick={() => { setGateMode("login"); setError(""); }} className="text-ink/45 underline">Use email & password</button>
              </div>
            </>
          )}

          {note && <p className="mt-3 text-center text-xs font-black text-emerald-600">{note}</p>}
          {error && <p className="mt-3 text-center text-xs font-black text-red-500">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#fbfaf7] px-4 py-5 text-ink">
      <div className="mx-auto w-full max-w-3xl">
        <header className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cobalt">LuxuryBandit</div>
            <h1 className="text-3xl font-black leading-none">Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <a href="/admin/trends" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 text-xs font-black text-ink active:scale-95 transition">
              Studio <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button type="button" onClick={() => void load()} title="Refresh" className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white active:scale-95 transition">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
            <button type="button" onClick={logout} title="Sign out" className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white text-ink/60 active:scale-95 transition">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="mt-4 flex items-center gap-1 rounded-xl border border-black/10 bg-white p-1">
          <button type="button" onClick={() => setTab("looks")}
            className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-black transition ${tab === "looks" ? "bg-black text-white" : "text-ink/50"}`}>
            <LayoutGrid className="h-4 w-4" /> A List <span className="opacity-60">{liveLooks}/{looks.length}</span>
          </button>
          <button type="button" onClick={() => setTab("curators")}
            className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-black transition ${tab === "curators" ? "bg-black text-white" : "text-ink/50"}`}>
            <Users className="h-4 w-4" /> Curators <span className="opacity-60">{curators.length}</span>
          </button>
          <button type="button" onClick={() => setTab("inbox")}
            className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-black transition ${tab === "inbox" ? "bg-black text-white" : "text-ink/50"}`}>
            <Inbox className="h-4 w-4" /> Inbox <span className="opacity-60">{comments.length + messages.length}</span>
          </button>
        </div>

        {tab !== "inbox" && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3">
            <Search className="h-4 w-4 text-ink/30" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={tab === "looks" ? "Search by name, curator, brand…" : "Search by name, email, brand…"}
              className="h-11 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-ink/30" />
            {query && <button type="button" onClick={() => setQuery("")} className="text-xs font-black text-ink/40">Clear</button>}
          </div>
        )}

        {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600">{error}</p>}

        {/* ── A List ── */}
        {tab === "looks" && (
          <div className="mt-3 grid grid-cols-1 gap-2 pb-16">
            {shownLooks.length === 0 && <p className="py-10 text-center text-sm font-bold text-ink/40">No listings.</p>}
            {shownLooks.map(l => {
              const live = l.published !== false;
              const img = l.frontImageUrl || l.imageUrl;
              return (
                <div key={l.id} className={`flex min-w-0 gap-3 rounded-xl border bg-white p-2.5 ${live ? "border-black/10" : "border-black/10 opacity-70"}`}>
                  <a href={`/look/${l.id}`} target="_blank" rel="noreferrer" title="View live in the frontend"
                    className="group relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-black/5 active:scale-95 transition">
                    {img ? <img src={img} alt="" className="h-full w-full object-cover object-top" /> : <div className="grid h-full w-full place-items-center text-[10px] font-black text-ink/30">LB</div>}
                    {l.videoUrl
                      ? <PlayCircle className="absolute bottom-1 right-1 h-4 w-4 text-white drop-shadow" />
                      : <ExternalLink className="absolute bottom-1 right-1 h-4 w-4 text-white opacity-0 drop-shadow transition group-hover:opacity-100" />}
                  </a>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-ink">{l.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${live ? "bg-emerald-100 text-emerald-700" : "bg-black/8 text-ink/50"}`}>{live ? "Live" : "Off"}</span>
                      {l.brand && <span className="rounded-full bg-cobalt/10 px-2 py-0.5 text-[10px] font-black text-cobalt">{l.brand}</span>}
                      <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-black text-ink/50">{l.aiCreated ? "AI" : "Curated"}</span>
                      {l.videoUrl && <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-black text-ink/50">Video</span>}
                    </div>
                    <div className="mt-1 truncate text-xs font-bold text-ink/55">
                      <span className="text-ink/70">{l.curatorName ?? "—"}</span>{l.price ? ` · ${l.price}` : ""}
                    </div>
                    {l.createdAt && <div className="mt-1 flex items-center gap-1 truncate text-[11px] font-bold text-ink/40"><Clock className="h-3 w-3 shrink-0" /> {fmtTs(l.createdAt)}</div>}
                    {l.productNote && <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-ink/45">{l.productNote}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-1.5">
                    <button type="button" disabled={busy === l.id} onClick={() => void setLookPublished(l.id, !live)} title={live ? "Deactivate" : "Activate"}
                      className={`grid h-9 w-9 place-items-center rounded-lg border active:scale-95 transition ${live ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-black/10 text-ink/50"}`}>
                      <Power className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setEditLook({ ...l })} title="Edit"
                      className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 text-ink/70 active:scale-95 transition">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={busy === l.id} onClick={() => armOrRun(l.id, () => void deleteLook(l.id))} title="Delete"
                      className={`grid h-9 place-items-center rounded-lg border active:scale-95 transition ${confirmId === l.id ? "w-full px-1 border-red-300 bg-red-500 text-white" : "w-9 border-black/10 text-red-500 hover:border-red-200"}`}>
                      {confirmId === l.id ? <span className="text-[10px] font-black">Sure?</span> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Curators ── */}
        {tab === "curators" && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-ink/35">Sort</span>
            {([["looks", "Looks"], ["tryons", "Try-ons"], ["name", "Name"]] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => pickSort(key)} title={sortC === key ? (sortDir === "desc" ? "Descending — tap to flip" : "Ascending — tap to flip") : "Sort"}
                className={`inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-xs font-black transition ${sortC === key ? "border-black bg-black text-white" : "border-black/10 text-ink/55"}`}>
                {label}
                {sortC === key && (sortDir === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />)}
              </button>
            ))}
          </div>
        )}

        {tab === "curators" && (
          <div className="mt-2 grid grid-cols-1 gap-2 pb-16">
            {shownCurators.length === 0 && <p className="py-10 text-center text-sm font-bold text-ink/40">No curators.</p>}
            {shownCurators.map(c => {
              const off = c.status === "deactivated";
              const house = c.id === "house";
              return (
                <div key={c.id} role={house ? undefined : "button"} tabIndex={house ? undefined : 0}
                  onClick={house ? undefined : () => { setEdit({ ...c }); setCreditsDraft(String(c.credits ?? "")); }}
                  onKeyDown={house ? undefined : e => { if (e.key === "Enter") { setEdit({ ...c }); setCreditsDraft(String(c.credits ?? "")); } }}
                  className={`flex w-full min-w-0 items-center gap-3 rounded-xl border bg-white p-2.5 text-left transition ${house ? "border-cobalt/30 bg-cobalt/[0.03]" : `cursor-pointer active:scale-[0.99] ${off ? "border-black/10 opacity-70" : "border-black/10"}`}`}>
                  {house ? (
                    <a href="/stores" target="_blank" rel="noreferrer" title="House looks in the frontend"
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-black text-[11px] font-black text-white active:scale-95 transition">LB</a>
                  ) : (
                    <a href={`/curator/${c.id}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} title="View profile in the frontend"
                      className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-black/5 text-sm font-black text-ink/50 active:scale-95 transition">
                      {c.photoUrl ? <img src={c.photoUrl} alt="" className="h-full w-full object-cover" /> : initials(c)}
                    </a>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-ink">{house ? "Admin (house)" : fullName(c)}</div>
                    <div className="truncate text-xs font-bold text-ink/45">{house ? "Looks & try-ons with no curator" : (c.email ?? "—")}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {!house && <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${off ? "bg-black/8 text-ink/50" : "bg-emerald-100 text-emerald-700"}`}>{off ? "Deactivated" : "Active"}</span>}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${sortC === "looks" ? "bg-cobalt/10 text-cobalt" : "bg-black/5 text-ink/50"}`}>{looksByCurator.get(c.id) ?? 0} looks</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${sortC === "tryons" ? "bg-cobalt/10 text-cobalt" : "bg-black/5 text-ink/50"}`}>{tryonsByCurator.get(c.id) ?? 0} try-ons</span>
                      {!house && typeof c.credits === "number" && <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-black text-ink/50">{c.credits} cr</span>}
                      {!house && c.brands && <span className="truncate rounded-full bg-cobalt/10 px-2 py-0.5 text-[10px] font-black text-cobalt">{c.brands.split(",")[0]}</span>}
                    </div>
                    {!house && c.createdAt && <div className="mt-1 flex items-center gap-1 truncate text-[11px] font-bold text-ink/40"><Clock className="h-3 w-3 shrink-0" /> {fmtTs(c.createdAt)}</div>}
                  </div>
                  {!house && (
                    <div className="flex shrink-0 items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <span className="rounded-lg border border-black/10 px-2.5 py-1.5 text-[11px] font-black text-ink/60">Edit</span>
                      <button type="button" disabled={busy === c.id} onClick={() => void setCuratorStatus(c.id, off ? "active" : "deactivated")} title={off ? "Activate" : "Deactivate"}
                        className={`grid h-9 w-9 place-items-center rounded-lg border active:scale-95 transition ${off ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-black/10 text-ink/60"}`}>
                        <Power className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Inbox ── */}
        {tab === "inbox" && (
          <div className="mt-3 pb-16">
            <div className="flex items-center gap-1.5">
              {([["comments", "Comments", comments.length], ["messages", "Messages", messages.length]] as const).map(([key, label, n]) => (
                <button key={key} type="button" onClick={() => setInboxTab(key)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-black transition ${inboxTab === key ? "border-black bg-black text-white" : "border-black/10 text-ink/55"}`}>
                  {key === "comments" ? <MessageCircle className="h-3.5 w-3.5" /> : <Inbox className="h-3.5 w-3.5" />} {label} <span className="opacity-60">{n}</span>
                </button>
              ))}
            </div>

            {inboxTab === "comments" && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                {comments.length === 0 && <p className="py-10 text-center text-sm font-bold text-ink/40">No comments yet.</p>}
                {comments.map(c => (
                  <div key={c.id} className="rounded-xl border border-black/10 bg-white p-3">
                    <div className="text-xs font-bold text-ink/55">
                      <span className="font-black text-ink">{c.authorName || "Anonymous"}</span> on{" "}
                      <a href={`/look/${c.lookId}`} target="_blank" rel="noreferrer" className="font-black text-cobalt">{c.lookName || "a look"}</a>
                      {c.curatorName ? <span className="text-ink/40"> · curator {c.curatorName}</span> : null}
                      <span className="text-ink/35"> · {fmtTs(c.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-[13px] leading-snug text-ink">{c.text}</p>
                    <div className="mt-2 flex gap-2">
                      <input value={reply[c.id] ?? ""} onChange={e => setReply(m => ({ ...m, [c.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") void replyComment(c); }}
                        placeholder={`Reply as ${c.curatorName || "LuxuryBandit"}…`}
                        className="h-10 flex-1 rounded-lg border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt" />
                      <button type="button" disabled={sendingId === c.id || !(reply[c.id] ?? "").trim()} onClick={() => void replyComment(c)}
                        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-black px-4 text-xs font-black text-white active:scale-95 transition disabled:opacity-40">
                        {sendingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3.5 w-3.5" /> Reply</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {inboxTab === "messages" && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                {messages.length === 0 && <p className="py-10 text-center text-sm font-bold text-ink/40">No messages yet.</p>}
                {messages.map(m => (
                  <div key={m.id} className="rounded-xl border border-black/10 bg-white p-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-ink/55">
                      <span className="font-black text-ink">{m.fromName || "Someone"}</span> →
                      <span className="font-black text-ink">{m.toName || "—"}</span>
                      <span className="text-ink/35"> · {fmtTs(m.createdAt)}</span>
                      {!m.readAt && <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">new</span>}
                    </div>
                    <p className="mt-1 text-[13px] leading-snug text-ink">{m.text}</p>
                    {m.toIsCurator ? (
                      <div className="mt-2 flex gap-2">
                        <input value={reply[m.id] ?? ""} onChange={e => setReply(mm => ({ ...mm, [m.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === "Enter") void replyMessage(m); }}
                          placeholder={`Reply as ${m.toName || "curator"}…`}
                          className="h-10 flex-1 rounded-lg border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt" />
                        <button type="button" disabled={sendingId === m.id || !(reply[m.id] ?? "").trim()} onClick={() => void replyMessage(m)}
                          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-black px-4 text-xs font-black text-white active:scale-95 transition disabled:opacity-40">
                          {sendingId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3.5 w-3.5" /> Reply</>}
                        </button>
                      </div>
                    ) : (
                      <p className="mt-1.5 text-[11px] font-bold text-ink/35">Sent to a non-curator account — reply from their own inbox.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Curator edit sheet ── */}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={e => { if (e.target === e.currentTarget) setEdit(null); }}>
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl">
            <div className="flex items-center gap-3 border-b border-black/10 px-5 py-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-black/5 text-sm font-black text-ink/50">
                {edit.photoUrl ? <img src={edit.photoUrl} alt="" className="h-full w-full object-cover" /> : initials(edit)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-black">{fullName(edit)}</div>
                <div className="text-[11px] font-bold text-ink/45">
                  {edit.status ?? "active"} · {looksByCurator.get(edit.id) ?? 0} looks · {edit.credits ?? 0} cr{edit.createdAt ? ` · joined ${fmtTs(edit.createdAt)}` : ""}
                </div>
              </div>
              <button type="button" onClick={() => setEdit(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10"><X className="h-4 w-4" /></button>
            </div>

            <div className="grid gap-3 overflow-y-auto px-5 py-4">
              <div className="grid gap-2 rounded-xl border border-cobalt/25 bg-cobalt/[0.04] p-3">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-cobalt"><LogIn className="h-3.5 w-3.5" /> Act as {edit.firstName || "this curator"}</div>
                <p className="text-[11px] font-bold text-ink/45">Signs in as {edit.firstName || "this curator"} (new tab) — Studio, messages, comments, try-ons & credits all run in their name. Your admin tab stays open.</p>
                <button type="button" onClick={() => loginAs(edit, "studio")}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-black text-sm font-black text-white active:scale-95 transition">
                  <LogIn className="h-4 w-4" /> Open Studio as {edit.firstName || "curator"}
                </button>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => loginAs(edit, "messages")}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-black/10 bg-white text-xs font-black text-ink active:scale-95 transition">
                    Messages
                  </button>
                  <button type="button" onClick={() => loginAs(edit, "feed")}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-black/10 bg-white text-xs font-black text-ink active:scale-95 transition">
                    Comments
                  </button>
                  <button type="button" onClick={() => loginAs(edit, "profile")}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-black/10 bg-white text-xs font-black text-ink active:scale-95 transition">
                    Profile
                  </button>
                </div>
              </div>
              <div className="flex items-end gap-2 rounded-xl bg-panel p-3">
                <label className="grid flex-1 gap-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-ink/40">Credits</span>
                  <input type="number" value={creditsDraft} onChange={e => setCreditsDraft(e.target.value)}
                    className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm font-black text-ink outline-none focus:border-cobalt" />
                </label>
                <button type="button" disabled={busy === edit.id || creditsDraft === String(edit.credits ?? "")} onClick={() => void saveCredits()}
                  className="h-10 shrink-0 rounded-lg bg-black px-4 text-xs font-black text-white active:scale-95 transition disabled:opacity-40">
                  {busy === edit.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set credits"}
                </button>
                <span className="pb-2.5 text-[11px] font-bold text-ink/40">spent {edit.creditsSpent ?? 0}</span>
              </div>
              <Field2 label="First name" v={edit.firstName} on={v => setEdit(e => e && { ...e, firstName: v })} label2="Last name" v2={edit.lastName} on2={v => setEdit(e => e && { ...e, lastName: v })} />
              <Field label="Email" v={edit.email} on={v => setEdit(e => e && { ...e, email: v })} />
              <Field2 label="Phone" v={edit.phone} on={v => setEdit(e => e && { ...e, phone: v })} label2="Instagram" v2={edit.instagram} on2={v => setEdit(e => e && { ...e, instagram: v })} />
              <Field label="Address" v={edit.address} on={v => setEdit(e => e && { ...e, address: v })} />
              <div className="my-1 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-ink/35"><Sparkles className="h-3.5 w-3.5" /> Taste</div>
              <Field label="Brands" v={edit.brands} on={v => setEdit(e => e && { ...e, brands: v })} />
              <Field label="Style" v={edit.style} on={v => setEdit(e => e && { ...e, style: v })} />
              <Field2 label="Gender focus" v={edit.genderFocus} on={v => setEdit(e => e && { ...e, genderFocus: v })} label2="Age focus" v2={edit.ageFocus} on2={v => setEdit(e => e && { ...e, ageFocus: v })} />
              <Field2 label="Colors" v={edit.colors} on={v => setEdit(e => e && { ...e, colors: v })} label2="Fabrics" v2={edit.fabrics} on2={v => setEdit(e => e && { ...e, fabrics: v })} />
              <Field2 label="Occasions" v={edit.occasions} on={v => setEdit(e => e && { ...e, occasions: v })} label2="Price tiers" v2={edit.priceTiers} on2={v => setEdit(e => e && { ...e, priceTiers: v })} />
              <Field label="Fit focus" v={edit.fitFocus} on={v => setEdit(e => e && { ...e, fitFocus: v })} />
              <Field label="Motto" v={edit.motto} on={v => setEdit(e => e && { ...e, motto: v })} />
              <Area label="Bio" v={edit.bio} on={v => setEdit(e => e && { ...e, bio: v })} />
            </div>

            <div className="flex items-center gap-2 border-t border-black/10 px-5 py-4">
              <button type="button" disabled={busy === edit.id} onClick={() => armOrRun(edit.id, () => void deleteCurator(edit.id))}
                className={`h-11 rounded-xl border px-3 text-xs font-black active:scale-95 transition ${confirmId === edit.id ? "border-red-300 bg-red-500 text-white" : "border-black/10 text-red-500"}`}>
                {confirmId === edit.id ? "Tap to confirm" : "Delete"}
              </button>
              <button type="button" onClick={() => setEdit(null)} className="ml-auto h-11 rounded-xl border border-black/10 px-4 text-sm font-black text-ink/60 active:scale-95 transition">Cancel</button>
              <button type="button" disabled={saving} onClick={() => void saveCurator()} className="flex h-11 items-center gap-2 rounded-xl bg-black px-5 text-sm font-black text-white active:scale-95 transition disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Listing edit sheet ── */}
      {editLook && (() => {
        const live = editLook.published !== false;
        const img = editLook.frontImageUrl || editLook.imageUrl;
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={e => { if (e.target === e.currentTarget) setEditLook(null); }}>
            <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl">
              <div className="flex items-center gap-3 border-b border-black/10 px-5 py-4">
                <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-black/5">
                  {img ? <img src={img} alt="" className="h-full w-full object-cover object-top" /> : <div className="grid h-full w-full place-items-center text-[10px] font-black text-ink/30">LB</div>}
                  {editLook.videoUrl && <PlayCircle className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 text-white drop-shadow" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black">{editLook.name}</div>
                  <div className="truncate text-[11px] font-bold text-ink/45">{editLook.curatorName ?? "—"}{editLook.brand ? ` · ${editLook.brand}` : ""}</div>
                  {editLook.createdAt && <div className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-ink/40"><Clock className="h-3 w-3" /> created {fmtTs(editLook.createdAt)}</div>}
                </div>
                <a href={`/look/${editLook.id}`} target="_blank" rel="noreferrer" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-black/10 px-3 text-[11px] font-black text-ink active:scale-95 transition">
                  View live <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button type="button" onClick={() => setEditLook(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10"><X className="h-4 w-4" /></button>
              </div>

              <div className="grid gap-3 overflow-y-auto px-5 py-4">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { void setLookPublished(editLook.id, !live); setEditLook(e => e && { ...e, published: !live }); }}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-black active:scale-95 transition ${live ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-black/10 text-ink/60"}`}>
                    <Power className="h-3.5 w-3.5" /> {live ? "Live — tap to deactivate" : "Off — tap to activate"}
                  </button>
                </div>
                <Field label="Name" v={editLook.name} on={v => setEditLook(e => e && { ...e, name: v })} />
                <Field2 label="Price" v={editLook.price} on={v => setEditLook(e => e && { ...e, price: v })} label2="Sale price" v2={editLook.salePrice} on2={v => setEditLook(e => e && { ...e, salePrice: v })} />
                <Area label="Description" v={editLook.productNote} on={v => setEditLook(e => e && { ...e, productNote: v })} />
                <Field label="Store / brand name" v={editLook.storeName} on={v => setEditLook(e => e && { ...e, storeName: v })} />
                <Field label="Buy URL" v={editLook.buyUrl} on={v => setEditLook(e => e && { ...e, buyUrl: v })} />
              </div>

              <div className="flex items-center gap-2 border-t border-black/10 px-5 py-4">
                <button type="button" disabled={busy === editLook.id} onClick={() => armOrRun(editLook.id, () => void deleteLook(editLook.id))}
                  className={`h-11 rounded-xl border px-3 text-xs font-black active:scale-95 transition ${confirmId === editLook.id ? "border-red-300 bg-red-500 text-white" : "border-black/10 text-red-500"}`}>
                  {confirmId === editLook.id ? "Tap to confirm" : "Delete"}
                </button>
                <button type="button" onClick={() => setEditLook(null)} className="ml-auto h-11 rounded-xl border border-black/10 px-4 text-sm font-black text-ink/60 active:scale-95 transition">Cancel</button>
                <button type="button" disabled={saving} onClick={() => void saveLook()} className="flex h-11 items-center gap-2 rounded-xl bg-black px-5 text-sm font-black text-white active:scale-95 transition disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}

function Field({ label, v, on }: { label: string; v?: string; on: (v: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-black uppercase tracking-wider text-ink/40">{label}</span>
      <input value={v ?? ""} onChange={e => on(e.target.value)}
        className="h-10 w-full rounded-lg border border-black/10 bg-panel px-3 text-sm font-bold text-ink outline-none focus:border-cobalt" />
    </label>
  );
}
function Field2(p: { label: string; v?: string; on: (v: string) => void; label2: string; v2?: string; on2: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={p.label} v={p.v} on={p.on} />
      <Field label={p.label2} v={p.v2} on={p.on2} />
    </div>
  );
}
function Area({ label, v, on }: { label: string; v?: string; on: (v: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-black uppercase tracking-wider text-ink/40">{label}</span>
      <textarea value={v ?? ""} onChange={e => on(e.target.value)} rows={3}
        className="w-full rounded-lg border border-black/10 bg-panel px-3 py-2 text-sm font-bold text-ink outline-none focus:border-cobalt" />
    </label>
  );
}
