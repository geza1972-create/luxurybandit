"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw, Search, Trash2, Power, PlayCircle, Users, LayoutGrid, ExternalLink, X, Sparkles, Pencil, Clock, ArrowUp, ArrowDown, LogOut, LogIn, Inbox, MessageCircle, Send, Heart, UserPlus, Video, BarChart3, Eye, MousePointerClick } from "lucide-react";
import { signInWithPassword, getStoredAuthSession, saveAuthSession, signOut, resetPassword } from "@/lib/supabase-auth-client";
import { isAdminEmail } from "@/lib/is-admin-email";
import { LOOK_CATEGORIES, categorizeLook, type LookCategory } from "@/lib/look-category";
import { publicLookLabel } from "@/lib/look-title";
import { safeLookImage } from "@/lib/look-image";

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
  tryOnImageUrl?: string; videoPosterUrl?: string; curatorNote?: string;
  curatorName?: string; curatorId?: string;
  price?: string; salePrice?: string; buyUrl?: string;
  brand?: string; productNote?: string; storeName?: string;
  category?: LookCategory; lingerie?: boolean;
  aiCreated?: boolean; createdAt?: string; videoCreatedAt?: string;
  likeCount?: number; commentCount?: number; viewCount?: number;
  clicks?: Record<string, number>;
  alternatives?: unknown[];
};

type FollowRec = { id: string; createdAt?: string; followeeName?: string; followeeCuratorId?: string; followerName?: string; followerIsCurator?: boolean };

// Same ordering key the public "The A List" uses: most recent activity first —
// a fresh video beats the publish date.
const lookWhen = (l: Look) => {
  const v = l.videoCreatedAt ?? "";
  const c = l.createdAt ?? "";
  return v > c ? v : c;
};

const slugify = (s?: string) => (s ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
type Msg = { id: string; text: string; createdAt: string; readAt?: string; fromUserId: string; fromName?: string; fromEmail?: string; toUserId: string; toName?: string; toIsCurator?: boolean };
type Cmt = { id: string; lookId: string; text: string; authorName?: string; createdAt: string; lookName?: string; curatorId?: string; curatorName?: string; parentId?: string; replyToName?: string };

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
  const [tab, setTab] = useState<"looks" | "curators" | "users" | "inbox" | "posts" | "insights">("looks");
  // "Users" tab: everyone who signed up — email-gate leads + Google/FB/password (Supabase auth).
  type AdminUser = { email: string; name: string; provider: string; status?: string; createdAt?: string; lookName?: string; leadId?: string; authId?: string };
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersAuthError, setUsersAuthError] = useState("");
  const [userEditId, setUserEditId] = useState("");
  const [userNameDraft, setUserNameDraft] = useState("");
  type AdminPost = { id: string; lookId: string; imageUrl: string; videoUrl?: string; customerName: string; curatorId: string; lookName: string; feed: boolean; createdAt: string };
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [postDateFrom, setPostDateFrom] = useState("");
  const [renaming, setRenaming] = useState<AdminPost | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const openRename = (p: AdminPost) => { setRenaming(p); setRenameValue(p.customerName || ""); };
  const [inboxTab, setInboxTab] = useState<"comments" | "messages" | "likes" | "followers">("comments");
  const [follows, setFollows] = useState<FollowRec[]>([]);
  const [followerQ, setFollowerQ] = useState("");
  const [followerDir, setFollowerDir] = useState<"desc" | "asc">("desc");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [comments, setComments] = useState<Cmt[]>([]);
  type FeedEvent = { id: string; name: string; lookId: string; createdAt: string; lookName?: string; source?: string; country?: string; city?: string; productLabel?: string; productLink?: string; productThumb?: string; visitor?: string };
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const [insightsRange, setInsightsRange] = useState<"today" | "7d" | "30d" | "all">("7d");
  const [insightsGroup, setInsightsGroup] = useState<"day" | "hour">("day");
  const [liveOn, setLiveOn] = useState(true);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState("");
  const [commentFilter, setCommentFilter] = useState<"new" | "all">("new");
  const [bulk, setBulk] = useState<{ running: boolean; done: number; total: number }>({ running: false, done: 0, total: 0 });
  const stopBulk = useRef(false);
  const [curators, setCurators] = useState<Curator[]>([]);
  const [looks, setLooks] = useState<Look[]>([]);
  const [community, setCommunity] = useState<{ customerName?: string; curatorId?: string }[]>([]);
  const [sortC, setSortC] = useState<"new" | "looks" | "tryons" | "name">("new");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const pickSort = (key: "looks" | "tryons" | "name") => {
    if (sortC === key) setSortDir(d => (d === "desc" ? "asc" : "desc"));
    else { setSortC(key); setSortDir("desc"); }
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [lookCatFilter, setLookCatFilter] = useState<LookCategory | null>(null); // A-List category filter
  const [busy, setBusy] = useState("");
  const [confirmId, setConfirmId] = useState("");
  const [edit, setEdit] = useState<Curator | null>(null); // curator being edited
  const [editLook, setEditLook] = useState<Look | null>(null); // listing being edited
  const [creditsDraft, setCreditsDraft] = useState(""); // credits input in curator sheet
  const [saving, setSaving] = useState(false);
  const [tryonPaused, setTryonPaused] = useState(false); // global try-on kill-switch
  const [tryonBusy, setTryonBusy] = useState(false);

  const headers = (p = pin, t = token): Record<string, string> => ({
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...(p ? { "x-try-look-admin-pin": p } : {}),
  });

  const armOrRun = (id: string, run: () => void) => {
    if (confirmId === id) { setConfirmId(""); run(); }
    else { setConfirmId(id); setTimeout(() => setConfirmId(c => (c === id ? "" : c)), 3500); }
  };

  // Global try-on kill-switch: read the live state on mount, flip via the admin action.
  useEffect(() => {
    fetch("/api/try-this-look").then(r => r.json()).then(d => setTryonPaused(d?.tryonPaused === true)).catch(() => {});
  }, []);
  const toggleTryonPaused = async () => {
    if (tryonBusy) return;
    setTryonBusy(true);
    const next = !tryonPaused;
    try {
      const r = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "set-tryon-paused", paused: next }) });
      if (r.ok) setTryonPaused(next);
      else setError("Could not toggle try-on (admin only).");
    } catch { setError("Could not toggle try-on."); }
    finally { setTryonBusy(false); }
  };

  const load = async (p = pin, t = token) => {
    if (!p && !t) return;
    setLoading(true); setError("");
    try {
      const [cr, lr, com, msg, cmt, fol] = await Promise.all([
        fetch("/api/try-this-look?curators=1", { headers: headers(p, t) }),
        fetch("/api/try-this-look?admin=1", { headers: headers(p, t) }),
        fetch("/api/try-this-look?community=1"),
        fetch("/api/messages?all=1", { headers: headers(p, t) }),
        fetch("/api/try-this-look?allComments=1", { headers: headers(p, t) }),
        fetch("/api/follow?all=1", { headers: headers(p, t) }),
      ]);
      if (cr.status === 401 || lr.status === 401) { setError("Wrong PIN."); setAuthed(false); setLoading(false); return; }
      const cd = await cr.json().catch(() => ({}));
      const ld = await lr.json().catch(() => ({}));
      const comd = await com.json().catch(() => ({}));
      const msgd = await msg.json().catch(() => ({}));
      const cmtd = await cmt.json().catch(() => ({}));
      const fold = await fol.json().catch(() => ({}));
      setCurators(Array.isArray(cd.curators) ? cd.curators : []);
      setLooks(Array.isArray(ld.looks) ? ld.looks : []);
      setFeedEvents(Array.isArray(ld.events) ? ld.events : []);
      setCommunity(Array.isArray(comd.community) ? comd.community : []);
      setMessages(Array.isArray(msgd.messages) ? msgd.messages : []);
      setComments(Array.isArray(cmtd.comments) ? cmtd.comments : []);
      setFollows(Array.isArray(fold.follows) ? fold.follows : []);
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
      const r = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "add-comment", lookId: c.lookId, text, authorName: c.curatorName || "LuxuryBandit", parentId: c.id, replyToName: c.authorName }) });
      if (r.ok) {
        setComments(cs => [{ id: `r-${Date.now()}`, lookId: c.lookId, text, authorName: c.curatorName, createdAt: new Date().toISOString(), lookName: c.lookName, curatorId: c.curatorId, curatorName: c.curatorName, parentId: c.id, replyToName: c.authorName }, ...cs]);
        setReply(m => ({ ...m, [c.id]: "" }));
      } else await fail(r, "Could not reply");
    } catch { setError("Network error."); }
    setSendingId("");
  };
  // AI-draft a reply for ONE comment → fill its input (user reviews & sends).
  const aiSuggest = async (c: Cmt) => {
    setSendingId(c.id + ":ai"); setError("");
    try {
      const cur = c.curatorId ? curatorById.get(c.curatorId) : undefined;
      const r = await fetch("/api/curator", { method: "POST", headers: headers(), body: JSON.stringify({ action: "comment-reply", curatorName: c.curatorName, style: cur?.style, lookName: c.lookName, commentText: c.text, authorName: c.authorName }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.reply) setReply(m => ({ ...m, [c.id]: d.reply })); else await fail(r, "AI reply failed");
    } catch { setError("Network error."); }
    setSendingId("");
  };
  // AI-reply ALL real (non-curator) comments, as each look's curator. The server
  // generates each 20-comment block in PARALLEL (one save per block) → fast. Admin
  // posts → no WhatsApp. Click again to stop.
  const aiReplyAll = async () => {
    if (bulk.running) { stopBulk.current = true; return; }
    const targets = newComments; // only unanswered originals (skips replies + already-answered)
    if (!targets.length) { setError("Nothing new to reply to."); return; }
    stopBulk.current = false; setError("");
    setBulk({ running: true, done: 0, total: targets.length });
    const CHUNK = 20;
    let done = 0;
    for (let i = 0; i < targets.length; i += CHUNK) {
      if (stopBulk.current) break;
      const ids = targets.slice(i, i + CHUNK).map(c => c.id);
      try { await fetch("/api/curator", { method: "POST", headers: headers(), body: JSON.stringify({ action: "bulk-comment-reply", ids }) }); }
      catch { /* skip block */ }
      done += ids.length;
      setBulk(b => ({ ...b, done }));
    }
    setBulk(b => ({ ...b, running: false }));
    void load();
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
  // Re-categorize a look (After Dark / Riviera / Boudoir / Off-Duty). Boudoir is the
  // lingerie category → the API forces lingerie:true and hides it from the "All" feed.
  const setLookCategory = async (id: string, category: LookCategory) => {
    setBusy(id); setError("");
    const prev = looks;
    setLooks(ls => ls.map(l => l.id === id ? { ...l, category, lingerie: category === "boudoir" ? true : false } : l));
    try {
      const r = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "update-look", id, category }) });
      if (!r.ok) { setLooks(prev); await fail(r, "Could not set category"); }
    } catch { setLooks(prev); setError("Network error."); }
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

  const curatorById = useMemo(() => new Map(curators.map(c => [c.id, c])), [curators]);
  // Each look's effective category (explicit or auto-inferred) — used to filter posts
  // (try-ons) by the category of the look they were generated on.
  const lookCatById = useMemo(() => new Map(looks.map(l => [l.id, l.category ?? categorizeLook(l)])), [looks]);

  // Comments: originals (no parentId) + which are already answered (have a reply).
  const replyByParent = useMemo(() => {
    const m = new Map<string, Cmt>();
    for (const c of comments) if (c.parentId && !m.has(c.parentId)) m.set(c.parentId, c);
    return m;
  }, [comments]);
  const originalComments = useMemo(() => comments.filter(c => !c.parentId), [comments]);
  const newComments = useMemo(() => originalComments.filter(c => !replyByParent.has(c.id)), [originalComments, replyByParent]);
  const shownComments = commentFilter === "new" ? newComments : originalComments;

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
    const dir = sortDir === "asc" ? 1 : -1; // desc by default: newest / most / Z first
    if (sortC === "new") arr.sort((a, b) => (String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""))) * dir);
    else if (sortC === "name") arr.sort((a, b) => fullName(a).localeCompare(fullName(b)) * dir);
    else if (sortC === "tryons") arr.sort((a, b) => ((tryonsByCurator.get(a.id) ?? 0) - (tryonsByCurator.get(b.id) ?? 0)) * dir);
    else arr.sort((a, b) => ((looksByCurator.get(a.id) ?? 0) - (looksByCurator.get(b.id) ?? 0)) * dir);
    // Admin/house entry pinned at the top (respects search).
    return hasHouse && (!q || "admin house".includes(q)) ? [houseCurator, ...arr] : arr;
  }, [curators, q, sortC, sortDir, looksByCurator, tryonsByCurator, hasHouse, houseCurator]);
  const shownLooks = useMemo(() => {
    let base = !q ? looks : looks.filter(l => `${l.name} ${l.curatorName ?? ""} ${l.brand ?? ""} ${l.productNote ?? ""}`.toLowerCase().includes(q));
    if (lookCatFilter) base = base.filter(l => (l.category ?? categorizeLook(l)) === lookCatFilter);
    return [...base].sort((a, b) => lookWhen(b).localeCompare(lookWhen(a))); // newest activity first — matches the frontend A List
  }, [looks, q, lookCatFilter]);

  // ── Posts tab: load all generations (incl. hidden), search by name + date ──
  useEffect(() => {
    if (tab !== "posts" || postsLoaded) return;
    fetch("/api/try-this-look?adminPosts=1", { headers: headers() })
      .then(r => r.ok ? r.json() : { posts: [] })
      .then((d: { posts?: AdminPost[] }) => { setPosts(d.posts ?? []); setPostsLoaded(true); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, postsLoaded]);

  // ── Users tab: everyone who signed up, DEDUPED by email — a person who both signed
  //    up (Supabase auth) AND left their email at the try-on gate (lead) is ONE row. ──
  const loadUsers = () => {
    setUsersLoading(true);
    fetch("/api/admin-users", { headers: headers() })
      .then(r => r.ok ? r.json() : { leads: [], authUsers: [], authError: "Admin only" })
      .then((d: { leads?: any[]; authUsers?: any[]; authError?: string }) => {
        const byEmail = new Map<string, AdminUser>();
        for (const a of (d.authUsers ?? [])) { // auth accounts first (the real login)
          const email = String(a.email ?? "").toLowerCase();
          if (!email) continue;
          byEmail.set(email, { email, name: a.name || "", provider: a.provider || "email", createdAt: a.createdAt, authId: a.id });
        }
        for (const l of (d.leads ?? [])) { // merge in email-gate leads by email
          const email = String(l.email ?? "").toLowerCase();
          if (!email) continue;
          const cur = byEmail.get(email);
          if (cur) {
            cur.leadId = l.id; cur.status = l.status; cur.lookName = l.lookName;
            if (!cur.name && l.name) cur.name = l.name;
            if (l.createdAt && (!cur.createdAt || String(l.createdAt) < String(cur.createdAt))) cur.createdAt = l.createdAt;
          } else {
            byEmail.set(email, { email, name: l.name || "", provider: "email", status: l.status, createdAt: l.createdAt, lookName: l.lookName, leadId: l.id });
          }
        }
        setUsers([...byEmail.values()].sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))));
        setUsersAuthError(d.authError ?? "");
        setUsersLoaded(true);
      })
      .catch(() => {})
      .finally(() => setUsersLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === "users" && !usersLoaded) loadUsers(); }, [tab, usersLoaded]);

  const patchUser = (email: string, patch: Partial<AdminUser>) => setUsers(us => us.map(x => x.email === email ? { ...x, ...patch } : x));
  // Edit name → update BOTH underlying records (lead + auth account) so they stay in sync.
  const saveUserName = async (u: AdminUser, name: string) => {
    patchUser(u.email, { name });
    setUserEditId("");
    if (u.leadId) await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "update-lead", id: u.leadId, name }) }).catch(() => {});
    if (u.authId) await fetch("/api/admin-users", { method: "POST", headers: headers(), body: JSON.stringify({ action: "update-auth-user", id: u.authId, name }) }).catch(() => {});
  };
  const setLeadStatus = async (u: AdminUser, status: string) => {
    if (!u.leadId) return;
    patchUser(u.email, { status });
    await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "update-lead", id: u.leadId, status }) }).catch(() => {});
  };
  const deleteUser = async (u: AdminUser) => {
    setUsers(us => us.filter(x => x.email !== u.email));
    if (u.leadId) await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "delete-lead", id: u.leadId }) }).catch(() => {});
    if (u.authId) await fetch("/api/admin-users", { method: "POST", headers: headers(), body: JSON.stringify({ action: "delete-auth-user", id: u.authId }) }).catch(() => {});
  };

  // ── Insights "Live": poll recent events every 4s while watching, so clicks stream in ──
  useEffect(() => {
    if (tab !== "insights" || !liveOn) return;
    let alive = true;
    const poll = () => {
      fetch("/api/try-this-look?recentEvents=200", { headers: headers() })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (alive && Array.isArray(d?.events)) setFeedEvents(d.events); })
        .catch(() => {});
    };
    poll();
    const iv = setInterval(poll, 4000);
    return () => { alive = false; clearInterval(iv); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, liveOn]);
  const togglePostFeed = async (p: AdminPost) => {
    const feed = !p.feed;
    setPosts(ps => ps.map(x => x.id === p.id ? { ...x, feed } : x));
    await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "set-generation-feed", generationId: p.id, feed }) }).catch(() => {});
  };
  const deletePost = async (p: AdminPost) => {
    if (!confirm("Permanently delete this post?")) return;
    setPosts(ps => ps.filter(x => x.id !== p.id));
    await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "delete-generation", id: p.id }) }).catch(() => {});
  };
  const [resetting, setResetting] = useState(false);
  const resetAnalytics = async (onlyInternal: boolean) => {
    if (!confirm(onlyInternal
      ? "Remove all internal/test events from the analytics?"
      : "Reset ALL funnel analytics — clears the event log and zeroes view counts. Vanity like/comment numbers are kept. Continue?")) return;
    setResetting(true);
    try {
      await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "reset-analytics", onlyInternal }) });
      setFeedEvents(fe => onlyInternal ? fe.filter(e => !e.internal) : []);
      await load();
    } catch { /**/ }
    setResetting(false);
  };
  // Rename a post (set the displayed name) — opens an inline modal (window.prompt is
  // blocked in many in-app webviews, which made the pencil button look dead).
  const saveRename = async () => {
    const p = renaming; if (!p) return;
    const customerName = renameValue.trim();
    setPosts(ps => ps.map(x => x.id === p.id ? { ...x, customerName } : x));
    setRenaming(null);
    await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "assign-generation", id: p.id, customerName }) }).catch(() => {});
  };
  // Admin: animate an image-only post — generate a try-on video from its still and
  // attach it to the post (free for staff). Pixverse takes a few minutes.
  const [videoBusy, setVideoBusy] = useState<string>("");
  const makePostVideo = async (p: AdminPost) => {
    if (p.videoUrl || videoBusy) return;
    setVideoBusy(p.id);
    try {
      const start = await fetch("/api/generate-tryon-video", { method: "POST", headers: headers(), body: JSON.stringify({ lookId: p.lookId, image: p.imageUrl }) }).then(r => r.json());
      if (!start?.videoId) throw new Error(start?.error || "Could not start the video.");
      let videoUrl = "";
      for (let i = 0; i < 90; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const poll = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || "")}`).then(r => r.json());
        if (poll.status === "done" && poll.videoUrl) { videoUrl = poll.videoUrl; break; }
        if (poll.status === "failed") throw new Error("Generation failed.");
      }
      if (!videoUrl) throw new Error("Timed out — try again.");
      await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "attach-generation-video", generationId: p.id, videoUrl }) });
      setPosts(ps => ps.map(x => x.id === p.id ? { ...x, videoUrl } : x));
    } catch (e) {
      alert("Video generation failed: " + (e instanceof Error ? e.message : "error"));
    }
    setVideoBusy("");
  };
  const shownPosts = useMemo(() => {
    return posts.filter(p => {
      if (q && !`${p.customerName} ${p.lookName}`.toLowerCase().includes(q)) return false;
      if (postDateFrom && String(p.createdAt).slice(0, 10) < postDateFrom) return false;
      if (lookCatFilter && lookCatById.get(p.lookId) !== lookCatFilter) return false;
      return true;
    });
  }, [posts, q, postDateFrom, lookCatFilter, lookCatById]);

  const liveLooks = looks.filter(l => l.published !== false).length;
  const activeCurators = curators.filter(c => c.status !== "deactivated").length;

  // Likes: only a count per look (no per-user identities) → rank looks by likes.
  const likedLooks = useMemo(() => looks.filter(l => (l.likeCount ?? 0) > 0).sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0)), [looks]);
  const totalLikes = useMemo(() => looks.reduce((s, l) => s + (l.likeCount ?? 0), 0), [looks]);
  // Followers grouped per curator they follow.
  const followersByCurator = useMemo(() => {
    const m = new Map<string, { name: string; curatorId?: string; followers: string[] }>();
    for (const f of follows) {
      const key = f.followeeCuratorId || f.followeeName || "?";
      const e = m.get(key) || { name: f.followeeName || "—", curatorId: f.followeeCuratorId, followers: [] };
      e.followers.push(f.followerName || "Someone");
      m.set(key, e);
    }
    return [...m.values()].sort((a, b) => b.followers.length - a.followers.length);
  }, [follows]);
  const shownFollowers = useMemo(() => {
    const fq = followerQ.trim().toLowerCase();
    const base = fq ? followersByCurator.filter(g => g.name.toLowerCase().includes(fq)) : followersByCurator;
    return [...base].sort((a, b) => (a.followers.length - b.followers.length) * (followerDir === "asc" ? 1 : -1));
  }, [followersByCurator, followerQ, followerDir]);

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

        <div className="mt-4 flex flex-wrap items-center gap-1 rounded-xl border border-black/10 bg-white p-1">
          <button type="button" onClick={() => setTab("looks")}
            className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-black transition ${tab === "looks" ? "bg-black text-white" : "text-ink/50"}`}>
            <LayoutGrid className="h-4 w-4" /> A List <span className="opacity-60">{liveLooks}/{looks.length}</span>
          </button>
          <button type="button" onClick={() => setTab("curators")}
            className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-black transition ${tab === "curators" ? "bg-black text-white" : "text-ink/50"}`}>
            <Users className="h-4 w-4" /> Curators <span className="opacity-60">{curators.length}</span>
          </button>
          <button type="button" onClick={() => setTab("users")}
            className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-black transition ${tab === "users" ? "bg-black text-white" : "text-ink/50"}`}>
            <UserPlus className="h-4 w-4" /> Users {usersLoaded && <span className="opacity-60">{users.length}</span>}
          </button>
          <button type="button" onClick={() => setTab("posts")}
            className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-black transition ${tab === "posts" ? "bg-black text-white" : "text-ink/50"}`}>
            <PlayCircle className="h-4 w-4" /> Posts {postsLoaded && <span className="opacity-60">{posts.length}</span>}
          </button>
          <button type="button" onClick={() => setTab("inbox")}
            className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-black transition ${tab === "inbox" ? "bg-black text-white" : "text-ink/50"}`}>
            <Inbox className="h-4 w-4" /> Inbox <span className="opacity-60">{newComments.length + messages.length}</span>
          </button>
          <button type="button" onClick={() => setTab("insights")}
            className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-black transition ${tab === "insights" ? "bg-black text-white" : "text-ink/50"}`}>
            <BarChart3 className="h-4 w-4" /> Insights
          </button>
        </div>

        {/* Global try-on kill-switch — flip it to instantly pause end-user generation
            ("coming soon"); clicks are still counted, and you + curators keep full access. */}
        <section className={`mt-3 flex items-center gap-3 rounded-xl border p-3 ${tryonPaused ? "border-amber-300 bg-amber-50" : "border-black/10 bg-white"}`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.06] text-base">{tryonPaused ? "⏸️" : "▶️"}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-ink">Try-on {tryonPaused ? "is PAUSED" : "is live"}</p>
            <p className="text-[11px] font-bold text-ink/45">
              {tryonPaused
                ? "End-users see “coming soon” (clicks still counted). You & curators keep full access."
                : "End-users generate for free. Pause instantly if volume or cost spikes."}
            </p>
          </div>
          <button type="button" onClick={toggleTryonPaused} disabled={tryonBusy}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-black text-white active:scale-95 transition-transform disabled:opacity-50 ${tryonPaused ? "bg-emerald-600" : "bg-black"}`}>
            {tryonBusy ? "…" : tryonPaused ? "Resume" : "Pause"}
          </button>
        </section>

        {tab !== "inbox" && tab !== "insights" && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-black/10 bg-white px-3">
              <Search className="h-4 w-4 text-ink/30" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder={tab === "posts" ? "Search by name or look…" : tab === "looks" ? "Search by name, curator, brand…" : "Search by name, email, brand…"}
                className="h-11 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-ink/30" />
              {query && <button type="button" onClick={() => setQuery("")} className="text-xs font-black text-ink/40">Clear</button>}
            </div>
            {tab === "posts" && (
              <input type="date" value={postDateFrom} onChange={e => setPostDateFrom(e.target.value)} title="From date"
                className="h-11 shrink-0 rounded-xl border border-black/10 bg-white px-3 text-sm font-bold text-ink/70 outline-none" />
            )}
          </div>
        )}

        {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600">{error}</p>}

        {/* ── Posts (all generations, incl. hidden) ── */}
        {tab === "posts" && (
          <div className="mt-3 pb-16">
            {/* Category filter chips — by the category of the look each post was made on. */}
            {(() => {
              const counts = new Map<LookCategory, number>();
              for (const p of posts) { const c = lookCatById.get(p.lookId); if (c) counts.set(c, (counts.get(c) ?? 0) + 1); }
              return (
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  <span className="mr-0.5 text-[10px] font-black uppercase tracking-wide text-ink/35">Try-ons</span>
                  <button type="button" onClick={() => setLookCatFilter(null)}
                    className={`rounded-full px-3 py-1 text-[11px] font-black transition ${lookCatFilter === null ? "bg-ink text-white" : "bg-black/5 text-ink/55 hover:bg-black/10"}`}>
                    Alle <span className="opacity-60">{posts.length}</span>
                  </button>
                  {LOOK_CATEGORIES.map(c => (
                    <button key={c.slug} type="button" onClick={() => setLookCatFilter(c.slug)}
                      className={`rounded-full px-3 py-1 text-[11px] font-black transition ${lookCatFilter === c.slug ? "bg-ink text-white" : "bg-black/5 text-ink/55 hover:bg-black/10"}`}>
                      {c.slug === "boudoir" ? "🔒 " : ""}{c.label} <span className="opacity-60">{counts.get(c.slug) ?? 0}</span>
                    </button>
                  ))}
                </div>
              );
            })()}
            <p className="mb-3 text-[11px] font-bold text-ink/40">{shownPosts.length} posts{(query || postDateFrom || lookCatFilter) ? " (filtered)" : ""}. Hidden ones are dimmed — tap Show to bring one back into the feeds.</p>
            {!postsLoaded ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-ink/30" /></div>
            ) : shownPosts.length === 0 ? (
              <p className="py-12 text-center text-sm font-bold text-ink/35">No posts.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {shownPosts.map(p => (
                  <div key={p.id} className={`flex items-center gap-3 rounded-lg border border-black/10 bg-white p-2 transition ${p.feed ? "" : "opacity-60"}`}>
                    <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-black/5">
                      {p.imageUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={p.imageUrl} alt={p.lookName} loading="lazy" decoding="async" className="h-full w-full object-cover object-top" />
                        : p.videoUrl
                          ? <video src={p.videoUrl} muted playsInline preload="metadata" className="h-full w-full object-cover object-top" />
                          : null}
                      {p.videoUrl && <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 py-px text-[7px] font-black uppercase text-white">Vid</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openRename(p)} title="Rename" className="flex min-w-0 items-center gap-1 text-left">
                          <span className="truncate text-[11px] font-black text-ink">{p.customerName || "Anonymous"}</span>
                          <Pencil className="h-3 w-3 shrink-0 text-ink/30" />
                        </button>
                        {!p.feed && <span className="shrink-0 rounded-full bg-black/70 px-1.5 py-px text-[8px] font-black uppercase text-white">Hidden</span>}
                      </div>
                      <p className="truncate text-[10px] font-bold text-ink/40">{p.lookName || "Try-on"} · {new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => void togglePostFeed(p)}
                        title={p.feed ? "Hide from the feeds" : "Activate — show in the feeds & reels"}
                        className={`rounded-full px-2 py-1 text-[10px] font-black transition ${p.feed ? "bg-black/[0.07] text-ink/60" : "bg-emerald-500 text-white"}`}>
                        {p.feed ? "Hide" : "Show"}
                      </button>
                      {!p.videoUrl && (
                        <button type="button" disabled={!!videoBusy} onClick={() => void makePostVideo(p)}
                          className="grid h-7 w-7 place-items-center rounded text-cobalt transition hover:bg-cobalt/10 disabled:opacity-40" title="Generate video">
                          {videoBusy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <a href={`/post/${p.id}`} target="_blank" rel="noopener noreferrer" className="grid h-7 w-7 place-items-center rounded text-ink/50 transition hover:bg-black/5" title="Open"><ExternalLink className="h-3.5 w-3.5" /></a>
                      <button type="button" onClick={() => void deletePost(p)} className="grid h-7 w-7 place-items-center rounded text-coral transition hover:bg-coral/10" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rename modal — inline edit (window.prompt is blocked in many webviews) */}
        {renaming && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-6" onClick={() => setRenaming(null)}>
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
              <p className="text-sm font-black text-ink">Rename post</p>
              <p className="mt-0.5 text-xs font-bold text-ink/45">Shown as the poster name. Clear it to make it Anonymous again.</p>
              <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") void saveRename(); if (e.key === "Escape") setRenaming(null); }}
                placeholder="e.g. a curator's name"
                className="mt-3 h-11 w-full rounded-xl border border-black/15 px-3 text-sm font-bold text-ink outline-none focus:border-black" />
              <div className="mt-4 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setRenaming(null)} className="rounded-full px-4 py-2 text-xs font-black text-ink/55 active:bg-black/5">Cancel</button>
                <button type="button" onClick={() => void saveRename()} className="rounded-full bg-black px-5 py-2 text-xs font-black text-white active:scale-95 transition">Save</button>
              </div>
            </div>
          </div>
        )}

        {/* ── A List ── */}
        {tab === "looks" && (
          <>
          {/* Category filter chips — All + the 4 editorial categories, each with a count. */}
          {(() => {
            const counts = new Map<LookCategory, number>();
            for (const l of looks) { const c = l.category ?? categorizeLook(l); counts.set(c, (counts.get(c) ?? 0) + 1); }
            return (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="mr-0.5 text-[10px] font-black uppercase tracking-wide text-ink/35">Looks</span>
                <button type="button" onClick={() => setLookCatFilter(null)}
                  className={`rounded-full px-3 py-1 text-[11px] font-black transition ${lookCatFilter === null ? "bg-ink text-white" : "bg-black/5 text-ink/55 hover:bg-black/10"}`}>
                  Alle <span className="opacity-60">{looks.length}</span>
                </button>
                {LOOK_CATEGORIES.map(c => (
                  <button key={c.slug} type="button" onClick={() => setLookCatFilter(c.slug)}
                    className={`rounded-full px-3 py-1 text-[11px] font-black transition ${lookCatFilter === c.slug ? "bg-ink text-white" : "bg-black/5 text-ink/55 hover:bg-black/10"}`}>
                    {c.slug === "boudoir" ? "🔒 " : ""}{c.label} <span className="opacity-60">{counts.get(c.slug) ?? 0}</span>
                  </button>
                ))}
              </div>
            );
          })()}
          <div className="mt-3 grid grid-cols-1 gap-2 pb-16">
            {shownLooks.length === 0 && <p className="py-10 text-center text-sm font-bold text-ink/40">No listings.</p>}
            {shownLooks.map(l => {
              const live = l.published !== false;
              // Licensing: never show the original brand photo — only our created image
              // (AI render / video poster), else the video itself, else a placeholder.
              const img = safeLookImage(l);
              return (
                <div key={l.id} className={`flex min-w-0 gap-3 rounded-xl border bg-white p-2.5 ${live ? "border-black/10" : "border-black/10 opacity-70"}`}>
                  <a href={`/look/${l.id}`} target="_blank" rel="noreferrer" title="View live in the frontend"
                    className="group relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-black/[0.04] to-black/[0.10] active:scale-95 transition">
                    {/* Soft branded placeholder behind — shown if there's no media or the
                        signed URL has expired (media hides itself on error, never a broken icon). */}
                    <span className="pointer-events-none absolute inset-0 grid place-items-center text-[11px] font-black tracking-wide text-ink/25">LB</span>
                    {img
                      ? <img src={img} alt="" onError={e => { e.currentTarget.style.display = "none"; }} className="relative h-full w-full object-cover object-top" />
                      : l.videoUrl
                        ? <video src={l.videoUrl} muted playsInline preload="metadata" onError={e => { e.currentTarget.style.display = "none"; }} className="relative h-full w-full object-cover object-top" />
                        : null}
                    {l.videoUrl
                      ? <PlayCircle className="absolute bottom-1 right-1 h-4 w-4 text-white drop-shadow" />
                      : <ExternalLink className="absolute bottom-1 right-1 h-4 w-4 text-white opacity-0 drop-shadow transition group-hover:opacity-100" />}
                  </a>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-ink">{publicLookLabel(l)}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${live ? "bg-emerald-100 text-emerald-700" : "bg-black/8 text-ink/50"}`}>{live ? "Live" : "Off"}</span>
                      <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-black text-ink/50">{l.aiCreated ? "AI" : "Curated"}</span>
                      {l.videoUrl && <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-black text-ink/50">Video</span>}
                    </div>
                    {/* Category — a single CHOICE (dropdown, not on/off toggles). Boudoir =
                        lingerie (private + hidden from "All"). Shows the auto-inferred
                        category until set by hand; picking another switches it. */}
                    {(() => {
                      const effective: LookCategory = l.category ?? categorizeLook(l);
                      return (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wide text-ink/40">Kategorie</span>
                          <select
                            value={effective}
                            disabled={busy === l.id}
                            onChange={(e) => void setLookCategory(l.id, e.target.value as LookCategory)}
                            className="rounded-full border border-black/15 bg-white px-2.5 py-1 text-[11px] font-black text-ink outline-none focus:border-cobalt disabled:opacity-50"
                          >
                            {LOOK_CATEGORIES.map(c => (
                              <option key={c.slug} value={c.slug}>{c.slug === "boudoir" ? "🔒 " : ""}{c.label}</option>
                            ))}
                          </select>
                          {!l.category && <span className="text-[9px] font-bold uppercase tracking-wide text-ink/30">auto</span>}
                        </div>
                      );
                    })()}
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
          </>
        )}

        {/* ── Curators ── */}
        {tab === "curators" && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-ink/35">Sort</span>
            {([["new", "Newest"], ["looks", "Looks"], ["tryons", "Try-ons"], ["name", "Name"]] as const).map(([key, label]) => (
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
              const pending = c.status === "pending";
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
                      {!house && (pending
                        ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">Pending review</span>
                        : <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${off ? "bg-black/8 text-ink/50" : "bg-emerald-100 text-emerald-700"}`}>{off ? "Deactivated" : "Active"}</span>)}
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
                      <button type="button" disabled={busy === c.id} onClick={() => void setCuratorStatus(c.id, (off || pending) ? "active" : "deactivated")} title={pending ? "Approve" : off ? "Activate" : "Deactivate"}
                        className={`grid h-9 w-9 place-items-center rounded-lg border active:scale-95 transition ${(off || pending) ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-black/10 text-ink/60"}`}>
                        <Power className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Users: everyone who signed up (email-gate leads + Google/FB/password) ── */}
        {tab === "users" && (
          <div className="mt-3 pb-16">
            {usersAuthError && (
              <p className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700">
                Google/Facebook/Passwort-User konnten nicht geladen werden ({usersAuthError}). E-Mail-Leads werden trotzdem angezeigt.
              </p>
            )}
            {usersLoading && !usersLoaded ? (
              <div className="flex items-center justify-center py-10 text-ink/40"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (() => {
              const q = query.trim().toLowerCase();
              const shown = q ? users.filter(u => `${u.name} ${u.email}`.toLowerCase().includes(q)) : users;
              if (shown.length === 0) return <p className="py-10 text-center text-sm font-bold text-ink/40">Noch keine User.</p>;
              const providerLabel = (u: AdminUser) => u.authId ? (u.provider === "google" ? "Google" : u.provider === "facebook" ? "Facebook" : "Passwort") : "E-Mail";
              return (
                <div className="flex flex-col gap-2">
                  {shown.map(u => {
                    const key = u.email;
                    return (
                      <div key={key} className="flex items-center gap-2.5 rounded-xl border border-black/10 bg-white p-3">
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${u.authId ? "bg-cobalt/10 text-cobalt" : "bg-black/[0.06] text-ink/60"}`}>{providerLabel(u)}</span>
                        <div className="min-w-0 flex-1">
                          {userEditId === key ? (
                            <input autoFocus value={userNameDraft} onChange={e => setUserNameDraft(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") void saveUserName(u, userNameDraft); if (e.key === "Escape") setUserEditId(""); }}
                              className="h-8 w-full rounded-lg border border-cobalt px-2 text-sm font-bold outline-none" placeholder="Name…" />
                          ) : (
                            <p className="truncate text-sm font-black text-ink">{u.name || <span className="text-ink/30">Kein Name</span>}</p>
                          )}
                          <p className="truncate text-[12px] font-bold text-ink/50">{u.email}</p>
                          <p className="truncate text-[10px] font-bold text-ink/35">{u.createdAt ? new Date(u.createdAt).toLocaleString() : ""}{u.lookName ? ` · ${u.lookName}` : ""}{u.authId && u.leadId ? " · auch Try-on-Lead" : ""}</p>
                        </div>
                        {u.leadId && (
                          <select value={u.status ?? "new"} onChange={e => void setLeadStatus(u, e.target.value)}
                            className="h-8 shrink-0 rounded-lg border border-black/10 bg-white px-1.5 text-[11px] font-black text-ink/70 outline-none">
                            <option value="new">Neu</option><option value="contacted">Kontaktiert</option><option value="closed">Erledigt</option>
                          </select>
                        )}
                        {userEditId === key ? (
                          <button type="button" onClick={() => void saveUserName(u, userNameDraft)} className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-black text-white active:scale-95 transition-transform">Save</button>
                        ) : (
                          <button type="button" onClick={() => { setUserEditId(key); setUserNameDraft(u.name); }} title="Name bearbeiten" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-black/10 text-ink/60 active:scale-95 transition-transform"><Pencil className="h-3.5 w-3.5" /></button>
                        )}
                        <button type="button" onClick={() => armOrRun(`u-${key}`, () => void deleteUser(u))} title="Löschen"
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border active:scale-95 transition-transform ${confirmId === `u-${key}` ? "border-red-500 bg-red-500 text-white" : "border-black/10 text-red-500"}`}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Inbox ── */}
        {tab === "inbox" && (
          <div className="mt-3 pb-16">
            <div className="flex flex-wrap items-center gap-1.5">
              {([["comments", "Comments", newComments.length], ["messages", "Messages", messages.length], ["likes", "Likes", totalLikes], ["followers", "Followers", follows.length]] as const).map(([key, label, n]) => (
                <button key={key} type="button" onClick={() => setInboxTab(key)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-black transition ${inboxTab === key ? "border-black bg-black text-white" : "border-black/10 text-ink/55"}`}>
                  {key === "comments" ? <MessageCircle className="h-3.5 w-3.5" /> : key === "messages" ? <Inbox className="h-3.5 w-3.5" /> : key === "likes" ? <Heart className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />} {label} <span className="opacity-60">{n}</span>
                </button>
              ))}
            </div>

            {inboxTab === "comments" && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                {newComments.length > 0 && (
                  <div className="flex items-center gap-2 rounded-xl border border-cobalt/25 bg-cobalt/[0.04] p-2.5">
                    <Sparkles className="h-4 w-4 shrink-0 text-cobalt" />
                    <p className="min-w-0 flex-1 text-[11px] font-bold text-ink/55">{bulk.running ? `Replying… ${bulk.done}/${bulk.total}` : `AI-reply the ${newComments.length} unanswered comment${newComments.length === 1 ? "" : "s"}, in each curator's voice (no WhatsApp).`}</p>
                    <button type="button" onClick={() => void aiReplyAll()}
                      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-black active:scale-95 transition ${bulk.running ? "border border-red-300 bg-red-500 text-white" : "bg-black text-white"}`}>
                      {bulk.running ? <><X className="h-3.5 w-3.5" /> Stop</> : <><Sparkles className="h-3.5 w-3.5" /> AI-reply all new</>}
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  {([["new", `New (${newComments.length})`], ["all", `All (${originalComments.length})`]] as const).map(([k, label]) => (
                    <button key={k} type="button" onClick={() => setCommentFilter(k)}
                      className={`h-8 rounded-lg border px-3 text-xs font-black transition ${commentFilter === k ? "border-black bg-black text-white" : "border-black/10 text-ink/55"}`}>{label}</button>
                  ))}
                </div>
                {shownComments.length === 0 && <p className="py-10 text-center text-sm font-bold text-ink/40">{commentFilter === "new" ? "All caught up — no new comments. 🎉" : "No comments yet."}</p>}
                {shownComments.map(c => {
                  const rep = replyByParent.get(c.id);
                  return (
                    <div key={c.id} className={`rounded-xl border bg-white p-3 ${rep ? "border-black/10" : "border-amber-300"}`}>
                      <div className="flex flex-wrap items-center gap-x-1 text-xs font-bold text-ink/55">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${rep ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{rep ? "Answered" : "New"}</span>
                        <span className="ml-1 font-black text-ink">{c.authorName || "Anonymous"}</span> on{" "}
                        <a href={`/look/${c.lookId}`} target="_blank" rel="noreferrer" className="font-black text-cobalt">{c.lookName || "a look"}</a>
                        <span className="text-ink/35"> · {fmtTs(c.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-[13px] leading-snug text-ink">{c.text}</p>
                      {rep ? (
                        <div className="mt-2 flex items-start gap-2 rounded-lg bg-black/[0.03] px-3 py-2">
                          <Send className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink/40" />
                          <p className="text-[12px] leading-snug text-ink/70"><span className="font-black text-ink">{rep.authorName || c.curatorName}</span> {rep.text}</p>
                        </div>
                      ) : (
                        <div className="mt-2 flex gap-2">
                          <input value={reply[c.id] ?? ""} onChange={e => setReply(m => ({ ...m, [c.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === "Enter") void replyComment(c); }}
                            placeholder={`Reply as ${c.curatorName || "LuxuryBandit"}…`}
                            className="h-10 flex-1 rounded-lg border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt" />
                          <button type="button" disabled={sendingId === c.id + ":ai"} onClick={() => void aiSuggest(c)} title="Draft with AI"
                            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-cobalt/30 bg-cobalt/5 px-3 text-xs font-black text-cobalt active:scale-95 transition disabled:opacity-40">
                            {sendingId === c.id + ":ai" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-3.5 w-3.5" /> AI</>}
                          </button>
                          <button type="button" disabled={sendingId === c.id || !(reply[c.id] ?? "").trim()} onClick={() => void replyComment(c)}
                            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-black px-4 text-xs font-black text-white active:scale-95 transition disabled:opacity-40">
                            {sendingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3.5 w-3.5" /> Reply</>}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
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

            {inboxTab === "likes" && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                <p className="text-[11px] font-bold text-ink/45">{totalLikes} likes across {likedLooks.length} looks. Likes are anonymous (device-based) — no per-person list.</p>
                {likedLooks.length === 0 && <p className="py-10 text-center text-sm font-bold text-ink/40">No likes yet.</p>}
                {likedLooks.map(l => {
                  const img = l.frontImageUrl || l.imageUrl;
                  return (
                    <div key={l.id} className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-2.5">
                      <a href={`/look/${l.id}`} target="_blank" rel="noreferrer" className="h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-black/5">
                        {img ? <img src={img} alt="" className="h-full w-full object-cover object-top" /> : null}
                      </a>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-ink">{l.name}</div>
                        <div className="truncate text-xs font-bold text-ink/45">{l.curatorName ?? "—"}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-coral/10 px-3 py-1.5 text-sm font-black text-coral">
                        <Heart className="h-4 w-4" fill="currentColor" /> {l.likeCount}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {inboxTab === "followers" && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-xl border border-black/10 bg-white px-3">
                    <Search className="h-4 w-4 text-ink/30" />
                    <input value={followerQ} onChange={e => setFollowerQ(e.target.value)} placeholder="Search creator…"
                      className="h-10 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-ink/30" />
                    {followerQ && <button type="button" onClick={() => setFollowerQ("")} className="text-xs font-black text-ink/40">Clear</button>}
                  </div>
                  <button type="button" onClick={() => setFollowerDir(d => d === "desc" ? "asc" : "desc")}
                    title={followerDir === "desc" ? "Most followers first" : "Fewest followers first"}
                    className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 text-xs font-black text-ink/60 active:scale-95 transition">
                    Followers {followerDir === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] font-bold text-ink/45">{follows.length} follows across {followersByCurator.length} curators{followerQ ? ` · ${shownFollowers.length} shown` : ""}.</p>
                {shownFollowers.length === 0 && <p className="py-10 text-center text-sm font-bold text-ink/40">No matches.</p>}
                {shownFollowers.map((g, i) => {
                  const cur = g.curatorId ? curatorById.get(g.curatorId) : undefined;
                  const ini = g.name.split(" ").map(w => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "?";
                  return (
                    <div key={g.curatorId || i} className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-3">
                      <a href={g.curatorId ? `/curator/${g.curatorId}` : "#"} target="_blank" rel="noreferrer"
                        className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-black/5 text-sm font-black text-ink/50">
                        {cur?.photoUrl ? <img src={cur.photoUrl} alt={g.name} className="h-full w-full object-cover" /> : ini}
                      </a>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-ink">{g.name}</div>
                        <div className="truncate text-xs font-bold text-ink/45">
                          {g.followers.slice(0, 6).join(", ")}{g.followers.length > 6 ? ` +${g.followers.length - 6} more` : ""}
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cobalt/10 px-2.5 py-1 text-xs font-black text-cobalt"><UserPlus className="h-3.5 w-3.5" /> {g.followers.length}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Insights tab ── */}
        {tab === "insights" && (() => {
          const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
          // Live-feed helpers: human label per event name + relative "12s ago" time.
          const evMeta: Record<string, { label: string; emoji: string }> = {
            tryon_click: { label: "tapped Try This Look", emoji: "✨" },
            bandit_click: { label: "tapped Bandit the feeling", emoji: "🛍️" },
            product_click: { label: "opened a product", emoji: "👗" },
            like_click: { label: "liked a look", emoji: "❤️" },
          };
          const ago = (iso: string) => {
            const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
            if (s < 60) return `${s}s ago`;
            if (s < 3600) return `${Math.floor(s / 60)}m ago`;
            if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
            return `${Math.floor(s / 86400)}d ago`;
          };
          const flag = (cc?: string) => (cc && cc.length === 2)
            ? String.fromCodePoint(...[...cc.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65))
            : "";
          // Time-range filter (applies to all event-based metrics below).
          const nowMs = Date.now();
          const cutoff = insightsRange === "today" ? new Date().setHours(0, 0, 0, 0)
            : insightsRange === "7d" ? nowMs - 7 * 864e5
            : insightsRange === "30d" ? nowMs - 30 * 864e5
            : 0;
          // Exclude internal (admin/test) traffic from every funnel metric.
          const evs = feedEvents.filter(e => !e.internal && new Date(e.createdAt).getTime() >= cutoff);
          const countOf = (name: string) => evs.filter(e => e.name === name).length;
          // Breakdown helper: count events by a field, sorted desc.
          const breakdown = (pick: (e: FeedEvent) => string | undefined, names?: string[]) => {
            const m = new Map<string, number>();
            for (const e of evs) {
              if (names && !names.includes(e.name)) continue;
              const k = (pick(e) || "").trim(); if (!k) continue;
              m.set(k, (m.get(k) ?? 0) + 1);
            }
            return [...m.entries()].sort((a, b) => b[1] - a[1]);
          };
          const sources = breakdown(e => e.source);
          const countries = breakdown(e => e.country);
          // Rich top-products: group product_click events by product, keep the thumbnail,
          // the count, and which look(s) the product was clicked from (with feed links).
          const productMap = new Map<string, { label: string; thumb: string; link: string; count: number; looks: Map<string, string> }>();
          for (const e of evs) {
            if (e.name !== "product_click") continue;
            const key = (e.productLink || e.productLabel || "").trim();
            if (!key) continue;
            const cur = productMap.get(key) ?? { label: e.productLabel || e.productLink || "Product", thumb: e.productThumb || "", link: e.productLink || "", count: 0, looks: new Map<string, string>() };
            cur.count += 1;
            if (!cur.thumb && e.productThumb) cur.thumb = e.productThumb;
            if (e.lookId) cur.looks.set(e.lookId, e.lookName || "Look");
            productMap.set(key, cur);
          }
          const topProducts = [...productMap.values()].sort((a, b) => b.count - a.count).slice(0, 15);
          const lookThumbById = new Map(looks.map(l => [l.id, l.frontImageUrl || l.imageUrl || l.videoPosterUrl || l.tryOnImageUrl || ""]));
          // Time series: events grouped by day or hour bucket.
          const series = (() => {
            const m = new Map<string, number>();
            for (const e of evs) {
              const d = new Date(e.createdAt);
              const key = insightsGroup === "hour"
                ? `${d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" })} ${String(d.getHours()).padStart(2, "0")}:00`
                : d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" });
              m.set(key, (m.get(key) ?? 0) + 1);
            }
            return [...m.entries()].reverse().slice(0, insightsGroup === "hour" ? 24 : 30);
          })();
          const seriesMax = Math.max(1, ...series.map(([, n]) => n));

          // Per-look event aggregation (within range).
          const eventsByLook = new Map<string, Record<string, number>>();
          for (const e of evs) {
            const m = eventsByLook.get(e.lookId) ?? {};
            m[e.name] = (m[e.name] ?? 0) + 1;
            eventsByLook.set(e.lookId, m);
          }
          const rows = looks.map(l => ({
            id: l.id, name: publicLookLabel(l.name, l.curatorNote, l.curatorName),
            curator: l.curatorName ?? "House",
            thumb: l.frontImageUrl || l.imageUrl || l.videoPosterUrl || l.tryOnImageUrl || "",
            hasVideo: !!l.videoUrl,
            views: (l as any).viewCount ?? 0, // lifetime counter (not event-based)
            likes: eventsByLook.get(l.id)?.["like_click"] ?? 0,
            comments: l.commentCount ?? 0,
            tryonClicks: eventsByLook.get(l.id)?.["tryon_click"] ?? 0,
            banditClicks: eventsByLook.get(l.id)?.["bandit_click"] ?? 0,
            productClicks: eventsByLook.get(l.id)?.["product_click"] ?? 0,
            affiliateClicks: l.clicks ? Object.values(l.clicks).reduce((s, n) => s + n, 0) : 0,
          })).sort((a, b) => (b.tryonClicks + b.likes + b.productClicks) - (a.tryonClicks + a.likes + a.productClicks) || b.views - a.views);
          const totalViews = rows.reduce((s, r) => s + r.views, 0);

          const Bars = ({ data, accent = "bg-cobalt" }: { data: [string, number][]; accent?: string }) => {
            const rows2 = (data ?? []).filter(Array.isArray);
            const max = Math.max(1, ...rows2.map(r => Number(r[1]) || 0));
            return (
              <div className="flex flex-col gap-1">
                {rows2.length === 0 && <p className="py-3 text-center text-[11px] font-bold text-ink/35">No data in this range.</p>}
                {rows2.map(r => {
                  const k = String(r[0]); const n = Number(r[1]) || 0;
                  return (
                    <div key={k} className="flex items-center gap-2">
                      <span className="w-28 shrink-0 truncate text-[10px] font-bold text-ink/55" title={k}>{k}</span>
                      <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
                        <div className={`h-full rounded-full ${accent}`} style={{ width: `${(n / max) * 100}%` }} />
                      </div>
                      <span className="w-8 shrink-0 text-right text-[10px] font-black text-ink">{fmt(n)}</span>
                    </div>
                  );
                })}
              </div>
            );
          };

          return (
            <div className="mt-3 pb-16">
              {/* Time-range filter + reset */}
              <div className="flex items-center gap-1.5">
                {([["today", "Today"], ["7d", "7 days"], ["30d", "30 days"], ["all", "All"]] as const).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => setInsightsRange(k)}
                    className={`h-8 rounded-lg border px-2.5 text-[11px] font-black transition ${insightsRange === k ? "border-black bg-black text-white" : "border-black/10 text-ink/55"}`}>{label}</button>
                ))}
                <button type="button" disabled={resetting} onClick={() => void resetAnalytics(false)}
                  className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg border border-black/10 px-2.5 text-[11px] font-black text-red-500 transition hover:bg-red-50 disabled:opacity-40" title="Clear the event log + view counts (vanity numbers kept)">
                  {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Reset
                </button>
              </div>
              <p className="mt-1.5 text-[10px] font-bold text-ink/35">Your own admin session is excluded automatically. Geo (country/city) shows once live on the server.</p>

              {/* Engagement tiles (event-based ones reflect the range) */}
              <div className="mt-3 grid grid-cols-4 gap-2">
                {([
                  ["Views", totalViews, Eye, "lifetime"],
                  ["Likes", countOf("like_click"), Heart, ""],
                  ["Try-on", countOf("tryon_click"), Sparkles, ""],
                  ["Bandit", countOf("bandit_click"), MousePointerClick, ""],
                ] as const).map(([label, n, Icon, sub]) => (
                  <div key={label} className="rounded-xl border border-black/10 bg-white p-3 text-center">
                    <Icon className="mx-auto mb-1 h-4 w-4 text-ink/40" />
                    <p className="text-lg font-black text-ink">{fmt(n)}</p>
                    <p className="text-[10px] font-bold text-ink/40">{label}{sub ? <span className="ml-0.5 text-ink/25">·{sub}</span> : ""}</p>
                  </div>
                ))}
              </div>

              {/* Live activity stream — auto-polls every 4s */}
              <div className="mt-4 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-ink/40">
                  {liveOn && <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>}
                  Live activity
                </p>
                <button type="button" onClick={() => setLiveOn(v => !v)}
                  className={`h-7 rounded-md border px-2.5 text-[10px] font-black transition ${liveOn ? "border-emerald-500 bg-emerald-500 text-white" : "border-black/10 text-ink/50"}`}>
                  {liveOn ? "● Live" : "Paused"}
                </button>
              </div>
              <div className="mt-2 flex max-h-80 flex-col gap-1 overflow-y-auto rounded-xl border border-black/10 bg-white p-2">
                {feedEvents.filter(e => evMeta[e.name] && !e.internal).length === 0 && (
                  <p className="py-6 text-center text-[11px] font-bold text-ink/35">Waiting for clicks… interactions appear here in real time.</p>
                )}
                {feedEvents.filter(e => evMeta[e.name] && !e.internal).slice(0, 40).map(e => {
                  const m = evMeta[e.name];
                  const who = (e.visitor || "").trim() || "Guest";
                  return (
                    <a key={e.id} href={`/look/${e.lookId}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-black/[0.03]">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black/[0.06] text-sm">{m.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-bold text-ink/80">
                          <span className="font-black text-ink">{who}</span> {m.label}
                          {e.name === "product_click" && e.productLabel ? <span className="text-ink/50"> · {e.productLabel}</span> : null}
                        </p>
                        <p className="truncate text-[9px] font-bold text-ink/40">
                          {e.lookName || "Look"}
                          {e.source ? ` · ${e.source}` : ""}
                          {e.country ? ` · ${flag(e.country)} ${e.city ? e.city + ", " : ""}${e.country}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-[9px] font-black text-ink/35">{ago(e.createdAt)}</span>
                    </a>
                  );
                })}
              </div>

              {/* Timeline */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wider text-ink/40">Activity over time</p>
                <div className="flex items-center gap-1">
                  {([["day", "Day"], ["hour", "Hour"]] as const).map(([k, label]) => (
                    <button key={k} type="button" onClick={() => setInsightsGroup(k)}
                      className={`h-7 rounded-md border px-2 text-[10px] font-black transition ${insightsGroup === k ? "border-black bg-black text-white" : "border-black/10 text-ink/50"}`}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="mt-2 rounded-xl border border-black/10 bg-white p-3">
                {series.length === 0
                  ? <p className="py-3 text-center text-[11px] font-bold text-ink/35">No activity in this range.</p>
                  : <div className="flex h-28 items-end gap-1">
                      {series.slice().reverse().map(([k, n]) => (
                        <div key={k} className="flex flex-1 flex-col items-center gap-1" title={`${k}: ${n}`}>
                          <div className="flex w-full items-end" style={{ height: "84px" }}>
                            <div className="w-full rounded-t bg-cobalt" style={{ height: `${(n / seriesMax) * 100}%` }} />
                          </div>
                          <span className="w-full truncate text-center text-[7px] font-bold text-ink/40">{k}</span>
                        </div>
                      ))}
                    </div>}
              </div>

              {/* Sources + Countries */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-wider text-ink/40">Traffic source</p>
                  <Bars data={sources} accent="bg-violet-500" />
                </div>
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-wider text-ink/40">Countries</p>
                  <Bars data={countries} accent="bg-emerald-500" />
                </div>
              </div>

              {/* Top products clicked — with image + which look they sit in */}
              <p className="mt-4 mb-2 text-xs font-black uppercase tracking-wider text-ink/40">Top products clicked</p>
              <div className="flex flex-col gap-1.5">
                {topProducts.length === 0 && <p className="py-3 text-center text-[11px] font-bold text-ink/35">No product taps in this range.</p>}
                {topProducts.map(p => (
                  <div key={p.label + p.link} className="flex items-center gap-3 rounded-lg border border-black/10 bg-white p-2.5">
                    <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded bg-black/5">
                      {p.thumb
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={p.thumb} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover"
                            onError={(e) => { const el = e.currentTarget; if (p.thumb && !el.dataset.proxied) { el.dataset.proxied = "1"; el.src = `/api/img-proxy?url=${encodeURIComponent(p.thumb)}`; } }} />
                        : <div className="grid h-full w-full place-items-center text-[9px] font-black text-ink/25">—</div>}
                      <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-white">{p.count}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[11px] font-black text-ink">{p.label}</p>
                        {p.link && <a href={p.link} target="_blank" rel="noreferrer" className="shrink-0 text-cobalt" title="Open product"><ExternalLink className="h-3 w-3" /></a>}
                      </div>
                      <p className="mt-0.5 text-[9px] font-black uppercase tracking-wide text-ink/35">In {p.looks.size} look{p.looks.size === 1 ? "" : "s"}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {[...p.looks.entries()].slice(0, 6).map(([lid, lname]) => (
                          <a key={lid} href={`/look/${lid}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 rounded-full border border-black/10 bg-panel py-0.5 pl-0.5 pr-2 active:scale-95 transition" title={`Open "${lname}" in the feed`}>
                            {lookThumbById.get(lid)
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={lookThumbById.get(lid)} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover object-top" />
                              : <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-black/10 text-[7px] font-black text-ink/40">LB</span>}
                            <span className="max-w-[120px] truncate text-[9px] font-bold text-ink/60">{lname}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Per look */}
              <p className="mt-4 mb-2 text-xs font-black uppercase tracking-wider text-ink/40">Per look</p>
              <div className="flex flex-col gap-1.5">
                {rows.filter(r => r.views > 0 || r.likes > 0 || r.tryonClicks > 0 || r.productClicks > 0).map(r => (
                  <div key={r.id} className="flex items-center gap-3 rounded-lg border border-black/10 bg-white p-2.5">
                    <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-black/5">
                      {r.thumb
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={r.thumb} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-top" />
                        : <div className="grid h-full w-full place-items-center text-[9px] font-black text-ink/25">LB</div>}
                      {r.hasVideo && <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 py-px text-[7px] font-black uppercase text-white">Vid</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-black text-ink">{r.name}</p>
                      <p className="truncate text-[10px] font-bold text-ink/40">{r.curator}</p>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-ink/50">
                        <span><Eye className="mb-px mr-0.5 inline h-3 w-3" />{fmt(r.views)}</span>
                        <span><Heart className="mb-px mr-0.5 inline h-3 w-3" />{fmt(r.likes)}</span>
                        <span>Try-on {fmt(r.tryonClicks)}</span>
                        <span>Bandit {fmt(r.banditClicks)}</span>
                        <span>Product {fmt(r.productClicks)}</span>
                        {r.affiliateClicks > 0 && <span>Shop {fmt(r.affiliateClicks)}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {rows.every(r => r.views === 0 && r.likes === 0 && r.tryonClicks === 0 && r.productClicks === 0) && (
                  <p className="py-10 text-center text-sm font-bold text-ink/40">No engagement data yet — views, likes, and clicks will appear here as users interact with the feed.</p>
                )}
              </div>
            </div>
          );
        })()}

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
