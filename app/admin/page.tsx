"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw, Search, Trash2, Power, PlayCircle, Users, LayoutGrid, ExternalLink, X, Sparkles, Pencil, Clock, ArrowUp, ArrowDown, LogOut, LogIn, Inbox, MessageCircle, Send, Heart, UserPlus, Video, BarChart3, Eye, MousePointerClick, Check, ImagePlus, Crop } from "lucide-react";
import { readPhotoFile, PhotoCropper } from "../curators/taste-form";
import { signInWithPassword, getStoredAuthSession, saveAuthSession, signOut, resetPassword } from "@/lib/supabase-auth-client";
import { isAdminEmail } from "@/lib/is-admin-email";
import { LOOK_CATEGORIES, categorizeLook, type LookCategory } from "@/lib/look-category";
import { publicLookLabel } from "@/lib/look-title";
import { safeLookImage } from "@/lib/look-image";
import InsightsPro from "@/components/InsightsPro";
import AdminConnections from "@/components/AdminConnections";

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
  // Server-computed engagement (curators=1): comments on her posts, total views
  // (boost + real), and "See her in other looks" taps.
  commentCount?: number; viewTotal?: number; tryonClicks?: number;
  // Earnings + payouts (model keeps 30% of each paid video).
  earningsCents?: number; payoutMethod?: string;
  payouts?: { id: string; amountCents: number; method: string; status: string; requestedAt?: string; paidAt?: string }[];
  // "✓ Real model" carousel badge (realModel) + profile banner (realBadge) — a real person, not an AI persona.
  realModel?: boolean; realBadge?: boolean;
  // CONCEPT 2.0 creation tool: role model she emulates + where her face comes from.
  styleModelId?: string; imageSource?: "own" | "ours";
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
  // Deep-linkable tab: /admin?tab=curators opens the Models list directly.
  const [tab, setTab] = useState<"looks" | "curators" | "users" | "inbox" | "posts" | "insights" | "chats">(() => {
    if (typeof window !== "undefined") {
      const t = new URLSearchParams(window.location.search).get("tab");
      if (t === "curators" || t === "users" || t === "inbox" || t === "posts" || t === "insights" || t === "chats") return t;
    }
    return "looks";
  });
  // Client-side navigations can mount before the state initializer sees the new URL — re-sync.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "curators" || t === "users" || t === "inbox" || t === "posts" || t === "insights" || t === "chats") setTab(t);
  }, []);
  // "Users" tab: everyone who signed up — email-gate leads + Google/FB/password (Supabase auth).
  type AdminUser = { email: string; name: string; provider: string; status?: string; createdAt?: string; lookName?: string; leadId?: string; authId?: string };
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  type Subscriber = { email: string; status: string; created: number; currentPeriodEnd: number; amount: number; currency: string };
  const [subscribers, setSubscribers] = useState<Subscriber[] | null>(null);
  const [usersAuthError, setUsersAuthError] = useState("");
  const [userEditId, setUserEditId] = useState("");
  const [userNameDraft, setUserNameDraft] = useState("");
  type AdminPost = { id: string; lookId: string; imageUrl: string; videoUrl?: string; customerName: string; ownerEmail?: string; curatorId: string; lookName: string; feed: boolean; public?: boolean; views?: number; createdAt: string };
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [postsLoaded, setPostsLoaded] = useState(false);
  // Posters whose signed URL failed to load (e.g. expired on a long-open tab) → fall back to
  // the video's own frame so the card never shows an empty grey box.
  const [posterFailed, setPosterFailed] = useState<Set<string>>(new Set());
  const [postDateFrom, setPostDateFrom] = useState("");
  // Bulk selection: pick many posts, then set their visibility tier or delete them.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [renaming, setRenaming] = useState<AdminPost | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const openRename = (p: AdminPost) => { setRenaming(p); setRenameValue(p.customerName || ""); };
  const [inboxTab, setInboxTab] = useState<"comments" | "messages" | "likes" | "followers">("comments");
  const [follows, setFollows] = useState<FollowRec[]>([]);
  const [followerQ, setFollowerQ] = useState("");
  const [followerDir, setFollowerDir] = useState<"desc" | "asc">("desc");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [comments, setComments] = useState<Cmt[]>([]);
  // AI "chat with the model" logs + global steering note.
  type ModelChatLog = { id: string; curatorId: string; curatorName?: string; visitorId: string; userName?: string; createdAt: string; updatedAt: string; messages: { role: "user" | "assistant"; content: string; at: string }[] };
  const [modelChats, setModelChats] = useState<ModelChatLog[]>([]);
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const [chatGlobalNote, setChatGlobalNote] = useState("");
  const [chatNoteDraft, setChatNoteDraft] = useState("");
  const [chatNoteBusy, setChatNoteBusy] = useState(false);
  const [openChatId, setOpenChatId] = useState("");
  // Compose a "from a model" check-in message to a user (→ their Messages + email).
  const [dmCurator, setDmCurator] = useState("");
  const [dmEmail, setDmEmail] = useState("");
  const [dmText, setDmText] = useState("");
  const [dmBusy, setDmBusy] = useState(false);
  const [dmMsg, setDmMsg] = useState("");
  const sendModelMessage = async () => {
    if (!dmCurator || !dmEmail.trim() || !dmText.trim()) return;
    setDmBusy(true); setDmMsg("");
    try {
      const r = await fetch("/api/model-chat", { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ action: "send-model-message", curatorId: dmCurator, toEmail: dmEmail.trim(), text: dmText.trim() }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(d.error ?? "Failed to send.");
      setDmMsg("Sent ✓"); setDmText("");
    } catch (e) { setDmMsg(e instanceof Error ? e.message : "Failed to send."); }
    finally { setDmBusy(false); }
  };
  const loadChats = async () => {
    try {
      const res = await fetch("/api/model-chat?all=1", { headers: headers() });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setModelChats(Array.isArray(d.chats) ? d.chats : []); setChatGlobalNote(d.globalNote ?? ""); setChatNoteDraft(d.globalNote ?? ""); setChatsLoaded(true); }
    } catch { /**/ }
  };
  const saveChatNote = async () => {
    setChatNoteBusy(true);
    try {
      await fetch("/api/model-chat", { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ action: "set-global-note", globalNote: chatNoteDraft }) });
      setChatGlobalNote(chatNoteDraft);
    } catch { /**/ } finally { setChatNoteBusy(false); }
  };
  const deleteChat = async (chatId: string) => {
    if (!window.confirm("Delete this conversation?")) return;
    setModelChats(cs => cs.filter(c => c.id !== chatId));
    try { await fetch("/api/model-chat", { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-chat", chatId }) }); } catch { /**/ }
  };
  // "Auf Deutsch" — translate a whole conversation so the owner can read every language.
  const [germanChats, setGermanChats] = useState<Record<string, string[]>>({}); // chatId → German messages
  const [translatingId, setTranslatingId] = useState("");
  const translateChat = async (chat: ModelChatLog) => {
    if (germanChats[chat.id]) { setGermanChats(g => { const n = { ...g }; delete n[chat.id]; return n; }); return; } // toggle off
    setTranslatingId(chat.id);
    try {
      const res = await fetch("/api/model-chat", { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ action: "translate", texts: chat.messages.map(m => m.content) }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(d.translations)) setGermanChats(g => ({ ...g, [chat.id]: d.translations }));
    } catch { /**/ } finally { setTranslatingId(""); }
  };
  // Correction → appended to that model's chat persona so future replies follow it.
  const [ruleDraft, setRuleDraft] = useState<Record<string, string>>({}); // curatorId → draft
  const [ruleBusyId, setRuleBusyId] = useState("");
  const [ruleDoneId, setRuleDoneId] = useState("");
  const addRule = async (curatorId: string) => {
    const rule = (ruleDraft[curatorId] ?? "").trim();
    if (!rule) return;
    setRuleBusyId(curatorId);
    try {
      const res = await fetch("/api/model-chat", { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ action: "add-rule", curatorId, rule }) });
      if (res.ok) { setRuleDraft(d => ({ ...d, [curatorId]: "" })); setRuleDoneId(curatorId); setTimeout(() => setRuleDoneId(""), 2500); }
    } catch { /**/ } finally { setRuleBusyId(""); }
  };
  // Wait for credentials (pin from localStorage or Supabase token) before fetching —
  // otherwise the first fire on tab-mount sends no auth and 401s without retrying.
  useEffect(() => { if (tab === "chats" && (pin || token) && !chatsLoaded) void loadChats(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab, pin, token]);
  type FeedEvent = { id: string; name: string; lookId: string; createdAt: string; lookName?: string; source?: string; country?: string; city?: string; productLabel?: string; productLink?: string; productThumb?: string; slide?: number; slides?: number; visitor?: string };
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const [viewsByDay, setViewsByDay] = useState<Record<string, number>>({}); // per-date view tallies
  const [visitsByDay, setVisitsByDay] = useState<Record<string, number>>({}); // per-date SITE visits
  const [insightsRange, setInsightsRange] = useState<"today" | "7d" | "30d" | "all">("today");
  const [insightsGroup, setInsightsGroup] = useState<"day" | "hour">("day");
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
  const [postTierFilter, setPostTierFilter] = useState<"private" | "community" | null>(null); // Try-ons visibility tier
  const [busy, setBusy] = useState("");
  const [confirmId, setConfirmId] = useState("");
  const [edit, setEdit] = useState<Curator | null>(null); // curator being edited
  const [editLook, setEditLook] = useState<Look | null>(null); // listing being edited
  const [creditsDraft, setCreditsDraft] = useState(""); // credits input in curator sheet
  const [saving, setSaving] = useState(false);
  const [tryonPaused, setTryonPaused] = useState(false); // global try-on kill-switch
  const [tryonBusy, setTryonBusy] = useState(false);
  const [chatNotifyPaused, setChatNotifyPaused] = useState(false); // chat WhatsApp/email alerts
  const [chatNotifyBusy, setChatNotifyBusy] = useState(false);
  // Manual newsletter blast to all email leads.
  const [nlSubject, setNlSubject] = useState("");
  const [nlMessage, setNlMessage] = useState("");
  const [nlCount, setNlCount] = useState<number | null>(null);
  const [nlBusy, setNlBusy] = useState(false);
  const [nlMsg, setNlMsg] = useState("");
  // Resend the model onboarding-steps email to an applicant who missed it.
  const [rsEmail, setRsEmail] = useState("");
  const [rsBusy, setRsBusy] = useState(false);
  const [rsMsg, setRsMsg] = useState("");
  const resendOnboarding = async () => {
    if (rsBusy || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rsEmail.trim())) return;
    setRsBusy(true); setRsMsg("");
    try {
      const r = await fetch("/api/curator", { method: "POST", headers: headers(), body: JSON.stringify({ action: "resend-onboarding", email: rsEmail.trim() }) });
      const d = await r.json();
      if (r.ok && d.ok) { setRsMsg(`✅ Schritte-Mail an ${rsEmail.trim()} gesendet.`); setRsEmail(""); }
      else setRsMsg(d.error || "Senden fehlgeschlagen.");
    } catch { setRsMsg("Senden fehlgeschlagen."); }
    finally { setRsBusy(false); }
  };

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
    fetch("/api/try-this-look").then(r => r.json()).then(d => { setTryonPaused(d?.tryonPaused === true); setChatNotifyPaused(d?.chatNotifyPaused === true); }).catch(() => {});
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
  // Chat-notification kill-switch: stop the WhatsApp/email ping on new chats (chats still log).
  const toggleChatNotifyPaused = async () => {
    if (chatNotifyBusy) return;
    setChatNotifyBusy(true);
    const next = !chatNotifyPaused;
    try {
      const r = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "set-chat-notify-paused", paused: next }) });
      if (r.ok) setChatNotifyPaused(next);
      else setError("Could not toggle chat alerts (admin only).");
    } catch { setError("Could not toggle chat alerts."); }
    finally { setChatNotifyBusy(false); }
  };
  // Newsletter: load the subscriber count once the admin is authed; send on demand.
  useEffect(() => {
    if (!pin && !token) return;
    fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "send-newsletter", count: "1" }) })
      .then(r => r.json()).then(d => { if (typeof d?.count === "number") setNlCount(d.count); }).catch(() => {});
  }, [pin, token]); // eslint-disable-line react-hooks/exhaustive-deps
  const sendNewsletter = async () => {
    if (nlBusy) return;
    setNlBusy(true); setNlMsg("");
    try {
      const r = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "send-newsletter", subject: nlSubject.trim(), message: nlMessage.trim() }) });
      const d = await r.json();
      if (r.ok && d.ok) { setNlMsg(`✅ An ${d.sent} Abonnenten gesendet.`); if (typeof d.recipients === "number") setNlCount(d.recipients); }
      else setNlMsg(d.error || "Senden fehlgeschlagen.");
    } catch { setNlMsg("Senden fehlgeschlagen."); }
    finally { setNlBusy(false); }
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

  // ── Upload a self-made video (e.g. from the Pixverse UI) for a model, straight
  // from this list. Direct-to-Supabase; first frame becomes the poster; lands in
  // her "In motion" reel as Fashionshow (members + profile, not public).
  const vidFileRef = useRef<HTMLInputElement>(null);

  // AI-face library (creation-tool pool). Admin uploads faces (single or many at once);
  // creators book a free one for $3.99. GET is public; add/delete are admin-gated.
  const faceFileRef = useRef<HTMLInputElement>(null);
  const [faces, setFaces] = useState<{ id: string; imageUrl: string; claimed: boolean }[]>([]);
  const [facesLoaded, setFacesLoaded] = useState(false);
  const [faceBusy, setFaceBusy] = useState(0); // remaining uploads in flight
  const [faceErr, setFaceErr] = useState("");
  const loadFaces = async () => {
    try {
      const r = await fetch("/api/try-this-look?avatarFaces=1", { cache: "no-store" });
      const d = await r.json();
      setFaces(Array.isArray(d.faces) ? d.faces : []);
    } catch { /**/ } finally { setFacesLoaded(true); }
  };
  const uploadFaces = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setFaceErr("");
    const list = Array.from(files);
    setFaceBusy(list.length);
    let failed = 0;
    for (const f of list) {
      try {
        const { src, error } = await readPhotoFile(f);
        if (!src) { failed++; if (error) setFaceErr(error); }
        else {
          const r = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "add-avatar-face", image: src }) });
          if (!r.ok) { failed++; setFaceErr((await r.json().catch(() => ({}))).error || "Upload failed."); }
        }
      } catch { failed++; }
      setFaceBusy(n => Math.max(0, n - 1));
    }
    if (failed) setFaceErr(prev => prev || `${failed} face${failed > 1 ? "s" : ""} failed to upload.`);
    await loadFaces();
  };
  const deleteFace = async (id: string, claimed: boolean) => {
    try {
      const r = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "delete-avatar-face", faceId: id, ...(claimed ? { force: true } : {}) }) });
      if (r.ok) setFaces(fs => fs.filter(f => f.id !== id));
    } catch { /**/ }
  };
  // Generate AI faces via fal FLUX → straight into the pool.
  const [faceGenOpen, setFaceGenOpen] = useState(false);
  const [facePrompt, setFacePrompt] = useState("");
  const [faceCount, setFaceCount] = useState(2);
  const [faceGenBusy, setFaceGenBusy] = useState(false);
  const [faceRef, setFaceRef] = useState(""); // optional reference image (data URL) → generate similar
  const faceRefFileRef = useRef<HTMLInputElement>(null);
  const pickFaceRef = async (file?: File) => {
    if (!file) return;
    const { src, error } = await readPhotoFile(file);
    if (src) setFaceRef(src); else if (error) setFaceErr(error);
  };
  const generateFaces = async () => {
    setFaceGenBusy(true); setFaceErr("");
    try {
      const r = await fetch("/api/generate-avatar-face", { method: "POST", headers: headers(), body: JSON.stringify({ prompt: facePrompt.trim() || undefined, count: faceCount, ...(faceRef ? { referenceImage: faceRef } : {}) }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setFaceErr(d.error || "Generation failed.");
      else { await loadFaces(); setFaceGenOpen(false); }
    } catch { setFaceErr("Generation failed."); }
    finally { setFaceGenBusy(false); }
  };
  // Big view + crop for a single face.
  const [bigFace, setBigFace] = useState<{ id: string; imageUrl: string; claimed: boolean } | null>(null);
  const [faceCropSrc, setFaceCropSrc] = useState(""); // data URL fed to PhotoCropper
  const [faceCropBusy, setFaceCropBusy] = useState(false);
  const startFaceCrop = async () => {
    if (!bigFace) return;
    setFaceErr("");
    try {
      const res = await fetch(bigFace.imageUrl);
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(String(fr.result)); fr.onerror = reject; fr.readAsDataURL(blob); });
      setFaceCropSrc(dataUrl);
    } catch { setFaceErr("Couldn't load this image for cropping."); }
  };
  const saveFaceCrop = async (dataUrl: string) => {
    if (!bigFace) return;
    setFaceCropBusy(true);
    try {
      const r = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "replace-avatar-face", faceId: bigFace.id, image: dataUrl }) });
      if (!r.ok) { setFaceErr((await r.json().catch(() => ({}))).error || "Crop failed."); }
      else { setFaceCropSrc(""); setBigFace(null); await loadFaces(); }
    } catch { setFaceErr("Crop failed."); } finally { setFaceCropBusy(false); }
  };
  useEffect(() => { if (tab === "curators" && !facesLoaded) void loadFaces(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab, facesLoaded]);
  const vidTargetRef = useRef<string>("");
  const [vidBusyId, setVidBusyId] = useState("");
  const pickModelVideo = (curatorId: string) => { vidTargetRef.current = curatorId; vidFileRef.current?.click(); };
  const videoFirstFrame = (file: File): Promise<string> => new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.muted = true; v.preload = "metadata"; v.src = url;
      const done = (out: string) => { try { URL.revokeObjectURL(url); } catch { /**/ } resolve(out); };
      v.onloadeddata = () => { try { v.currentTime = Math.min(0.1, (v.duration || 1) * 0.02); } catch { done(""); } };
      v.onseeked = () => {
        try {
          const c = document.createElement("canvas");
          c.width = v.videoWidth || 720; c.height = v.videoHeight || 1280;
          const ctx = c.getContext("2d");
          if (ctx) { ctx.drawImage(v, 0, 0, c.width, c.height); done(c.toDataURL("image/webp", 0.82)); } else done("");
        } catch { done(""); }
      };
      v.onerror = () => done("");
      setTimeout(() => done(""), 6000);
    } catch { resolve(""); }
  });
  const uploadModelVideo = async (file: File) => {
    const curatorId = vidTargetRef.current;
    if (!curatorId || vidBusyId) return;
    if (!file.type.startsWith("video/")) { setError("Bitte eine Videodatei wählen."); return; }
    setVidBusyId(curatorId); setError("");
    try {
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
      const posterImage = await videoFirstFrame(file);
      const sig = await fetch("/api/generate-tryon-video", { method: "POST", headers: headers(), body: JSON.stringify({ importVideo: true, sign: true, ext }) }).then(r => r.json());
      if (!sig.uploadUrl || !sig.path) throw new Error(sig.error || "Upload konnte nicht starten");
      const put = await fetch(sig.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "video/mp4", "x-upsert": "true" }, body: file });
      if (!put.ok) throw new Error("Upload zu Supabase fehlgeschlagen");
      const att = await fetch("/api/generate-tryon-video", { method: "POST", headers: headers(), body: JSON.stringify({ importVideo: true, videoPath: sig.path }) }).then(r => r.json());
      if (!att.videoUrl) throw new Error(att.error || "Signieren fehlgeschlagen");
      const add = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "add-model-video", curatorId, videoUrl: att.videoUrl, ...(posterImage ? { posterImage } : {}) }) }).then(r => r.json());
      if (!add.ok) throw new Error(add.error || "Video konnte nicht gespeichert werden");
      setNote("Video hochgeladen ✓ — im Profil hinter dem Foto (Play-Button) abrufbar.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Fehler beim Hochladen"); }
    finally { setVidBusyId(""); vidTargetRef.current = ""; }
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
  // Connect a generated video to a look (→ free try-on) / disconnect it. Used by AdminConnections.
  const attachLookVideo = async (lookId: string, generationId: string): Promise<boolean> => {
    try {
      const r = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "attach-look-video-from-generation", lookId, generationId }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setLooks(ls => ls.map(l => l.id === lookId ? { ...l, videoUrl: d.videoUrl } : l)); return true; }
    } catch { /**/ }
    return false;
  };
  const detachLookVideo = async (lookId: string): Promise<boolean> => {
    try {
      const r = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "detach-look-video", lookId }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setLooks(ls => ls.map(l => l.id === lookId ? { ...l, videoUrl: undefined } : l)); return true; }
    } catch { /**/ }
    return false;
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

  // Toggle the "✓ Real model" badge (a real person vs our AI persona). Sets BOTH the carousel
  // badge (realModel) and the profile banner (realBadge), same as the profile-page button.
  const toggleRealModel = async (c: Curator) => {
    const next = !(c.realModel === true || c.realBadge === true);
    setBusy(`real-${c.id}`); setError("");
    try {
      const r = await fetch("/api/curator", { method: "POST", headers: headers(), body: JSON.stringify({ action: "update", id: c.id, realModel: next, realBadge: next }) });
      if (r.ok) {
        setCurators(cs => cs.map(x => x.id === c.id ? { ...x, realModel: next, realBadge: next } : x));
        setEdit(e => e && e.id === c.id ? { ...e, realModel: next, realBadge: next } : e);
      } else await fail(r, "Could not update real-model badge");
    } catch { setError("Network error."); }
    setBusy("");
  };

  // Mark a model's payout request as paid (after you've transferred the money).
  const markPayoutPaid = async (curatorId: string, requestId: string) => {
    setBusy(requestId); setError("");
    try {
      const r = await fetch("/api/curator", { method: "POST", headers: headers(), body: JSON.stringify({ action: "mark-payout-paid", id: curatorId, requestId }) });
      if (r.ok) {
        setCurators(cs => cs.map(c => c.id !== curatorId ? c : { ...c, payouts: (c.payouts ?? []).map(p => p.id === requestId ? { ...p, status: "paid", paidAt: new Date().toISOString() } : p) }));
      } else await fail(r, "Could not mark paid");
    } catch { setError("Network error."); }
    setBusy("");
  };

  // All PENDING payout requests across every model, newest first (drives the admin payouts panel).
  const pendingPayouts = useMemo(() => {
    const out: { curatorId: string; name: string; method: string; reqId: string; amountCents: number; requestedAt?: string }[] = [];
    for (const c of curators) {
      for (const p of c.payouts ?? []) {
        if (p.status === "pending") out.push({ curatorId: c.id, name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || "Model", method: p.method, reqId: p.id, amountCents: p.amountCents, requestedAt: p.requestedAt });
      }
    }
    return out.sort((a, b) => (b.requestedAt ?? "").localeCompare(a.requestedAt ?? ""));
  }, [curators]);

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
  // Premium subscribers (from Stripe) — who is actually paying.
  useEffect(() => {
    if (tab !== "users" || subscribers !== null) return;
    fetch("/api/premium?subscribers=1", { headers: headers() })
      .then(r => r.ok ? r.json() : { subscribers: [] })
      .then((d: { subscribers?: Subscriber[] }) => setSubscribers(d.subscribers ?? []))
      .catch(() => setSubscribers([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, subscribers]);

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

  // ── Insights: poll recent events every 10s while watching, so the funnel/tiles stay fresh ──
  useEffect(() => {
    if (tab !== "insights") return;
    let alive = true;
    const poll = () => {
      fetch("/api/try-this-look?recentEvents=200", { headers: headers() })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (alive && Array.isArray(d?.events)) { setFeedEvents(d.events); if (d.viewsByDay) setViewsByDay(d.viewsByDay); if (d.visitsByDay) setVisitsByDay(d.visitsByDay); } })
        .catch(() => {});
    };
    poll();
    const iv = setInterval(poll, 10000);
    return () => { alive = false; clearInterval(iv); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);
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
  // Admin: upscale a post's 360p video to HD (1080p) and replace it in place. No
  // re-generation (the upscale endpoint takes no prompt) — same clip, sharper.
  const [hdBusy, setHdBusy] = useState<string>("");
  // Publish a try-on video to Instagram as a Reel (needs IG_ACCESS_TOKEN + IG_USER_ID in Vercel).
  const [igBusy, setIgBusy] = useState<string>("");
  const publishToIg = async (p: AdminPost) => {
    if (!p.videoUrl || igBusy) return;
    setIgBusy(p.id);
    const caption = `${p.lookName || "New luxury look"} ✨\n\nDiscover it on LuxuryBandit.\n#LuxuryBandit #luxuryfashion #ootd #reels`;
    try {
      const r = await fetch("/api/instagram-publish", { method: "POST", headers: headers(), body: JSON.stringify({ videoUrl: p.videoUrl, caption }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) setError("✅ Published to Instagram!");
      else setError(d.error || "Instagram publish failed.");
    } catch { setError("Instagram publish failed."); }
    finally { setIgBusy(""); }
  };
  const upscalePost = async (p: AdminPost) => {
    if (!p.videoUrl || hdBusy) return;
    if (!confirm("Dieses Video in HD (1080p) umrechnen? Kostet Pixverse-Credits, ~1–2 Min.")) return;
    setHdBusy(p.id);
    try {
      const start = await fetch("/api/generate-tryon-video", { method: "POST", headers: headers(), body: JSON.stringify({ upscale: true, videoUrl: p.videoUrl }) }).then(r => r.json());
      if (!start?.videoId) throw new Error(start?.error || "Upscale konnte nicht starten.");
      let videoUrl = "";
      for (let i = 0; i < 90; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const poll = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}`).then(r => r.json());
        if (poll.status === "done" && poll.videoUrl) { videoUrl = poll.videoUrl; break; }
        if (poll.status === "failed") throw new Error("Umrechnen fehlgeschlagen.");
      }
      if (!videoUrl) throw new Error("Zeitüberschreitung.");
      await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "attach-generation-video", generationId: p.id, videoUrl }) });
      setPosts(ps => ps.map(x => x.id === p.id ? { ...x, videoUrl } : x));
      alert("In HD umgerechnet ✓ — neu laden zum Ansehen.");
    } catch (e) {
      alert("HD fehlgeschlagen: " + (e instanceof Error ? e.message : "error"));
    }
    setHdBusy("");
  };
  const shownPosts = useMemo(() => {
    return posts.filter(p => {
      if (q && !`${p.customerName} ${p.lookName} ${p.ownerEmail ?? ""}`.toLowerCase().includes(q)) return false;
      if (postDateFrom && String(p.createdAt).slice(0, 10) < postDateFrom) return false;
      if (postTierFilter) {
        const t = p.public ? "public" : p.feed ? "community" : "private";
        if (t !== postTierFilter) return false;
      }
      return true;
    });
  }, [posts, q, postDateFrom, postTierFilter]);

  // ── Bulk selection + actions (visibility tier / delete) ──
  const postTierOf = (p: AdminPost): "private" | "community" | "public" => (p.public ? "public" : p.feed ? "community" : "private");
  const toggleSelect = (id: string) => setSelectedPostIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const clearSelection = () => { setSelectedPostIds(new Set()); setSelectMode(false); };
  const allShownSelected = shownPosts.length > 0 && shownPosts.every(p => selectedPostIds.has(p.id));
  const toggleSelectAllShown = () => setSelectedPostIds(allShownSelected ? new Set() : new Set(shownPosts.map(p => p.id)));
  const bulkSetTier = async (tier: "private" | "community" | "public") => {
    const ids = [...selectedPostIds];
    if (!ids.length) return;
    setBulkBusy(true);
    const feed = tier !== "private", pub = tier === "public";
    setPosts(ps => ps.map(x => selectedPostIds.has(x.id) ? { ...x, feed, public: pub } : x));
    try { await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "bulk-generation-visibility", ids, tier }) }); } catch { /**/ }
    setBulkBusy(false); clearSelection();
  };
  const bulkDelete = async () => {
    const ids = [...selectedPostIds];
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} post${ids.length > 1 ? "s" : ""} permanently?`)) return;
    setBulkBusy(true);
    setPosts(ps => ps.filter(x => !selectedPostIds.has(x.id)));
    try { await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "bulk-delete-generations", ids }) }); } catch { /**/ }
    setBulkBusy(false); clearSelection();
  };

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
            <Users className="h-4 w-4" /> Models <span className="opacity-60">{curators.length}</span>
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
          <button type="button" onClick={() => setTab("chats")}
            className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-black transition ${tab === "chats" ? "bg-black text-white" : "text-ink/50"}`}>
            <MessageCircle className="h-4 w-4" /> Chats {chatsLoaded && <span className="opacity-60">{modelChats.length}</span>}
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

        {/* Chat-notification kill-switch: stop the WhatsApp/email ping when people chat (the chats
            still land in the admin history — you just don't get pinged). */}
        <section className={`mt-3 flex items-center gap-3 rounded-xl border p-3 ${chatNotifyPaused ? "border-amber-300 bg-amber-50" : "border-black/10 bg-white"}`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.06] text-base">{chatNotifyPaused ? "🔕" : "🔔"}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-ink">Chat alerts {chatNotifyPaused ? "are OFF" : "are ON"}</p>
            <p className="text-[11px] font-bold text-ink/45">
              {chatNotifyPaused
                ? "New chats no longer ping your WhatsApp/email. They still appear in Chats history."
                : "You get a WhatsApp + email when someone starts a new chat. Turn off if it's too much."}
            </p>
          </div>
          <button type="button" onClick={toggleChatNotifyPaused} disabled={chatNotifyBusy}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-black text-white active:scale-95 transition-transform disabled:opacity-50 ${chatNotifyPaused ? "bg-emerald-600" : "bg-black"}`}>
            {chatNotifyBusy ? "…" : chatNotifyPaused ? "Turn on" : "Turn off"}
          </button>
        </section>

        {/* Manual newsletter: send the latest looks to every email lead, on demand. */}
        <section className="mt-3 rounded-xl border border-black/10 bg-white p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.06] text-base">📧</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-ink">Newsletter{nlCount != null ? ` · ${nlCount} subscribers` : ""}</p>
              <p className="text-[11px] font-bold text-ink/45">Send an email with the latest looks to everyone who gave their email. You send it — nothing auto.</p>
            </div>
          </div>
          <input value={nlSubject} onChange={e => setNlSubject(e.target.value)} placeholder="Subject (optional)"
            className="mt-2 h-10 w-full rounded-lg border border-black/12 bg-black/[0.02] px-3 text-sm font-bold text-ink outline-none focus:border-black/40" />
          <textarea value={nlMessage} onChange={e => setNlMessage(e.target.value)} rows={2} placeholder="Message (optional) — the newest looks are added automatically"
            className="mt-2 w-full rounded-lg border border-black/12 bg-black/[0.02] p-3 text-sm font-bold text-ink outline-none focus:border-black/40" />
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={() => armOrRun("newsletter", () => void sendNewsletter())} disabled={nlBusy || !nlCount}
              className="shrink-0 rounded-full bg-black px-4 py-2 text-xs font-black text-white active:scale-95 transition-transform disabled:opacity-40">
              {nlBusy ? "Sending…" : confirmId === "newsletter" ? "Sure — send?" : `Send to ${nlCount ?? 0}`}
            </button>
            {nlMsg && <span className="text-[11px] font-black text-ink/60">{nlMsg}</span>}
          </div>
        </section>

        {/* Resend the model onboarding-steps email to an applicant who missed it (e.g. applied
            before the self-service template). New applicants get it automatically on apply. */}
        <section className="mt-3 rounded-xl border border-black/10 bg-white p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.06] text-base">📩</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-ink">Resend model steps</p>
              <p className="text-[11px] font-bold text-ink/45">Send the "complete your profile" steps email again to an applicant. (New applicants get it automatically.)</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input value={rsEmail} onChange={e => setRsEmail(e.target.value)} type="email" placeholder="applicant@email.com"
              className="h-10 flex-1 rounded-lg border border-black/12 bg-black/[0.02] px-3 text-sm font-bold text-ink outline-none focus:border-black/40" />
            <button type="button" onClick={() => void resendOnboarding()} disabled={rsBusy || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rsEmail.trim())}
              className="shrink-0 rounded-full bg-black px-4 py-2 text-xs font-black text-white active:scale-95 transition-transform disabled:opacity-40">
              {rsBusy ? "Sending…" : "Send"}
            </button>
          </div>
          {rsMsg && <p className="mt-1.5 text-[11px] font-black text-ink/60">{rsMsg}</p>}
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
            {/* Visibility-tier filter chips — All / Private / Community (the moderation tiers). */}
            {(() => {
              const tierOf = (p: AdminPost) => (p.public ? "public" : p.feed ? "community" : "private");
              const privateCount = posts.filter(p => tierOf(p) === "private").length;
              const communityCount = posts.filter(p => tierOf(p) === "community").length;
              const chip = (label: string, value: "private" | "community" | null, count: number) => (
                <button type="button" onClick={() => setPostTierFilter(value)}
                  className={`rounded-full px-3 py-1 text-[11px] font-black transition ${postTierFilter === value ? "bg-ink text-white" : "bg-black/5 text-ink/55 hover:bg-black/10"}`}>
                  {label} <span className="opacity-60">{count}</span>
                </button>
              );
              return (
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  <span className="mr-0.5 text-[10px] font-black uppercase tracking-wide text-ink/35">Try-ons</span>
                  {chip("Alle", null, posts.length)}
                  {chip("Private", "private", privateCount)}
                  {chip("Community", "community", communityCount)}
                </div>
              );
            })()}
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold text-ink/40">{shownPosts.length} posts{(query || postDateFrom || postTierFilter) ? " (filtered)" : ""}.</p>
              <button type="button" onClick={() => { if (selectMode) clearSelection(); else setSelectMode(true); }}
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black transition ${selectMode ? "bg-ink text-white" : "bg-black/5 text-ink/60 hover:bg-black/10"}`}>
                {selectMode ? "Cancel" : "Select"}
              </button>
            </div>
            {/* Bulk action bar — set the visibility tier or delete the selected posts. */}
            {selectMode && (
              <div className="sticky top-0 z-10 mb-3 rounded-xl border border-black/10 bg-white/95 p-2 shadow-sm backdrop-blur">
                <div className="mb-2 flex items-center justify-between">
                  <button type="button" onClick={toggleSelectAllShown}
                    className="inline-flex items-center gap-1.5 rounded-full bg-cobalt/10 px-3 py-1 text-[11px] font-black text-cobalt active:scale-95 transition">
                    <span className={`grid h-4 w-4 place-items-center rounded border ${allShownSelected ? "border-cobalt bg-cobalt text-white" : "border-cobalt/40"}`}>{allShownSelected && <Check className="h-3 w-3" />}</span>
                    {allShownSelected ? "Deselect all" : `Select all ${shownPosts.length}`}
                  </button>
                  <span className="text-[11px] font-black text-ink/50">{selectedPostIds.size} selected</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" disabled={bulkBusy || !selectedPostIds.size} onClick={() => void bulkSetTier("private")}
                    className="rounded-full bg-black/[0.07] px-3 py-1.5 text-[11px] font-black text-ink/70 disabled:opacity-40 active:scale-95 transition">Private</button>
                  <button type="button" disabled={bulkBusy || !selectedPostIds.size} onClick={() => void bulkSetTier("community")}
                    className="rounded-full bg-ink px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-40 active:scale-95 transition">Community</button>
                  <button type="button" disabled={bulkBusy || !selectedPostIds.size} onClick={() => void bulkSetTier("public")}
                    className="rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-40 active:scale-95 transition">Public</button>
                  <button type="button" disabled={bulkBusy || !selectedPostIds.size} onClick={() => void bulkDelete()}
                    className="ml-auto rounded-full bg-coral px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-40 active:scale-95 transition">Delete</button>
                  {bulkBusy && <Loader2 className="h-4 w-4 animate-spin self-center text-ink/40" />}
                </div>
              </div>
            )}
            {!postsLoaded ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-ink/30" /></div>
            ) : shownPosts.length === 0 ? (
              <p className="py-12 text-center text-sm font-bold text-ink/35">No posts.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {shownPosts.map(p => (
                  <div key={p.id} onClick={selectMode ? () => toggleSelect(p.id) : undefined}
                    className={`flex items-center gap-3 rounded-lg border bg-white p-2 transition ${selectMode ? "cursor-pointer " : ""}${selectedPostIds.has(p.id) ? "border-cobalt ring-1 ring-cobalt" : "border-black/10"} ${p.feed ? "" : "opacity-60"}`}>
                    {selectMode && (
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selectedPostIds.has(p.id) ? "border-cobalt bg-cobalt text-white" : "border-black/25"}`}>
                        {selectedPostIds.has(p.id) && <Check className="h-3.5 w-3.5" />}
                      </span>
                    )}
                    <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-black/5">
                      {p.imageUrl && !posterFailed.has(p.id)
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={p.imageUrl} alt={p.lookName} loading="lazy" decoding="async"
                            onError={() => p.videoUrl && setPosterFailed(s => new Set(s).add(p.id))}
                            className="h-full w-full object-cover object-top" />
                        : p.videoUrl
                          ? <video src={`${p.videoUrl}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover object-top" />
                          : null}
                      {p.videoUrl && <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 py-px text-[7px] font-black uppercase text-white">Vid</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openRename(p)} title="Rename" className="flex min-w-0 items-center gap-1 text-left">
                          <span className="truncate text-[11px] font-black text-ink">{p.customerName || "Anonymous"}</span>
                          <Pencil className="h-3 w-3 shrink-0 text-ink/30" />
                        </button>
                        {(() => { const t = postTierOf(p); const m = t === "public" ? { l: "Public", c: "bg-emerald-500" } : t === "community" ? { l: "Community", c: "bg-ink" } : { l: "Private", c: "bg-black/70" }; return <span className={`shrink-0 rounded-full ${m.c} px-1.5 py-px text-[8px] font-black uppercase text-white`}>{m.l}</span>; })()}
                      </div>
                      <p className="flex items-center gap-1.5 text-[10px] font-bold text-ink/40">
                        <span className="min-w-0 truncate">{p.lookName || "Try-on"}</span>
                        <span className="shrink-0 whitespace-nowrap">· {new Date(p.createdAt).toLocaleDateString()}</span>
                        <span className="shrink-0 inline-flex items-center gap-0.5 whitespace-nowrap text-ink/55" title="Views (look)"><Eye className="h-3 w-3" />{(p.views ?? 0).toLocaleString()}</span>
                      </p>
                      {/* Who actually generated it: a real customer's email, or admin pre-gen. */}
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] font-black" title="Generated by">
                        {p.ownerEmail
                          ? <span className="inline-flex min-w-0 items-center gap-1 rounded bg-indigo-50 px-1.5 py-px text-indigo-700"><span className="shrink-0">👤</span><span className="truncate">{p.ownerEmail}</span></span>
                          : <span className="rounded bg-black/[0.06] px-1.5 py-px text-ink/35">Admin pre-generated</span>}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {/* Open in the feed — always available (opens in a new tab; keeps selection). */}
                      <a href={`/post/${p.id}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="grid h-7 w-7 place-items-center rounded text-cobalt transition hover:bg-cobalt/10" title="Open in feed"><PlayCircle className="h-4 w-4" /></a>
                      {!selectMode && (
                        <>
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
                          {p.videoUrl && (
                            <button type="button" disabled={!!hdBusy} onClick={() => void upscalePost(p)}
                              className="grid h-7 min-w-7 place-items-center rounded bg-amber-400 px-1.5 text-[10px] font-black text-black transition active:scale-95 disabled:opacity-40" title="In HD umrechnen (1080p)">
                              {hdBusy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "HD"}
                            </button>
                          )}
                          {p.videoUrl && (
                            <button type="button" disabled={igBusy === p.id}
                              onClick={() => armOrRun(`ig-${p.id}`, () => void publishToIg(p))}
                              className="grid h-7 min-w-7 place-items-center rounded bg-gradient-to-tr from-fuchsia-600 to-orange-400 px-1.5 text-[10px] font-black text-white transition active:scale-95 disabled:opacity-40" title="Auf Instagram veröffentlichen (Reel)">
                              {igBusy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : confirmId === `ig-${p.id}` ? "Sure?" : "IG"}
                            </button>
                          )}
                          <button type="button" onClick={() => void deletePost(p)} className="grid h-7 w-7 place-items-center rounded text-coral transition hover:bg-coral/10" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                        </>
                      )}
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
                      <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-black text-ink/50">{l.aiCreated ? "AI" : "Model"}</span>
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
        {/* "Try-on connections" panel removed from the Models tab (admin request — didn't
            belong here). The attach/detach handlers + AdminConnections component are kept for
            reuse elsewhere if needed. */}
        {/* Payout requests — models withdraw their video earnings; you transfer the money
            (IBAN/PayPal) then tap "Mark paid". */}
        {tab === "curators" && pendingPayouts.length > 0 && (
          <div className="mt-3 rounded-2xl border border-amber-400/40 bg-amber-50 p-3">
            <p className="flex items-center gap-1.5 text-[12px] font-black text-amber-800">💸 Payout requests <span className="rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{pendingPayouts.length}</span></p>
            <div className="mt-2 space-y-1.5">
              {pendingPayouts.map(p => (
                <div key={p.reqId} className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-white px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-black text-ink">{p.name} · <span className="text-emerald-600">€{(p.amountCents / 100).toFixed(2)}</span></p>
                    <p className="truncate text-[11px] font-bold text-ink/50">to {p.method}{p.requestedAt ? ` · ${new Date(p.requestedAt).toLocaleDateString()}` : ""}</p>
                  </div>
                  <button type="button" onClick={() => void markPayoutPaid(p.curatorId, p.reqId)} disabled={busy === p.reqId}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-black px-3 text-[11px] font-black text-white active:scale-95 transition disabled:opacity-50">
                    {busy === p.reqId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Mark paid
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
            <a href="/admin/curators/apply"
              className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-black px-3.5 text-xs font-black text-white active:scale-95 transition">
              <UserPlus className="h-4 w-4" /> New model
            </a>
          </div>
        )}

        {tab === "curators" && (
          <div className="mt-3 rounded-2xl border border-black/10 bg-white p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-ink">AI-face library <span className="text-ink/40">{faces.length}</span></p>
                <p className="text-[12px] font-bold text-ink/45">Faces creators can book for $3.99. Free = claimable, Booked = taken.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={() => { setFaceGenOpen(o => !o); setFaceErr(""); }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/15 px-3 text-xs font-black text-ink active:scale-95 transition">
                  <Sparkles className="h-4 w-4" /> Generate
                </button>
                <button type="button" onClick={() => faceFileRef.current?.click()} disabled={faceBusy > 0}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-black px-3.5 text-xs font-black text-white active:scale-95 transition disabled:opacity-50">
                  {faceBusy > 0 ? <><Loader2 className="h-4 w-4 animate-spin" /> {faceBusy} left…</> : <><ImagePlus className="h-4 w-4" /> Add faces</>}
                </button>
              </div>
            </div>
            {faceGenOpen && (
              <div className="mt-3 rounded-xl border border-black/12 bg-black/[0.02] p-3">
                <p className="text-[12px] font-black uppercase tracking-wider text-ink/50">Generate AI faces · fal FLUX</p>
                {/* Reference image → generate a SIMILAR face (no words needed). */}
                <div className="mt-2 flex items-center gap-2">
                  {faceRef ? (
                    <div className="relative shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={faceRef} alt="" className="h-14 w-[42px] rounded-lg object-cover" />
                      <button type="button" onClick={() => setFaceRef("")} className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-black text-[11px] text-white ring-1 ring-white/30">×</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => faceRefFileRef.current?.click()}
                      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-black/15 px-3 text-xs font-black text-ink active:scale-95 transition">
                      <ImagePlus className="h-4 w-4" /> Reference image
                    </button>
                  )}
                  <p className="text-[11px] font-bold text-ink/45">{faceRef ? "Will generate a SIMILAR face — description below is optional." : "Optional: upload a reference to make a similar face (no words needed)."}</p>
                </div>
                <input ref={faceRefFileRef} type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" className="hidden"
                  onChange={e => { void pickFaceRef(e.target.files?.[0]); e.target.value = ""; }} />
                <textarea value={facePrompt} onChange={e => setFacePrompt(e.target.value)} rows={3}
                  placeholder={faceRef ? "Not needed in reference mode — the image sets the look." : "Describe the face (blank = luxury fashion influencer, full-body 3:4). e.g. 'brunette Mediterranean woman, red evening gown, rooftop at dusk'"}
                  className="mt-2 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-[13px] font-semibold text-ink outline-none focus:border-black/40" />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 text-[12px] font-bold text-ink/60">
                    How many
                    <select value={faceCount} onChange={e => setFaceCount(Number(e.target.value))}
                      className="rounded-md border border-black/15 bg-white px-2 py-1 text-[12px] font-black text-ink">
                      {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <button type="button" onClick={() => void generateFaces()} disabled={faceGenBusy}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-black px-4 text-xs font-black text-white active:scale-95 transition disabled:opacity-50">
                    {faceGenBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4" /> {faceRef ? "Generate similar" : "Generate"} {faceCount}</>}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] font-bold text-ink/40">A few cents per image · portrait 3:4 · added straight to the pool (free/unclaimed).</p>
              </div>
            )}
            <input ref={faceFileRef} type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" multiple className="hidden"
              onChange={e => { void uploadFaces(e.target.files); e.target.value = ""; }} />
            {faceErr && <p className="mt-2 text-[12px] font-bold text-red-500">{faceErr}</p>}
            {faces.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {faces.map(f => (
                  <div key={f.id} className="relative aspect-[3/4] overflow-hidden rounded-xl border border-black/10 bg-black/[0.04]">
                    <button type="button" onClick={() => setBigFace(f)} title="Tap to enlarge / crop" className="block h-full w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.imageUrl} alt="" loading="lazy" className="h-full w-full object-contain" />
                    </button>
                    <span className={`absolute bottom-1 left-1 rounded-full px-1.5 py-0.5 text-[9px] font-black ${f.claimed ? "bg-black/70 text-white/70" : "bg-emerald-600 text-white"}`}>{f.claimed ? "Booked" : "Free"}</span>
                    <button type="button" title={f.claimed ? "Booked — delete anyway" : "Delete face"}
                      onClick={() => armOrRun(`face-${f.id}`, () => void deleteFace(f.id, f.claimed))}
                      className={`absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full text-white ring-1 ring-white/30 transition ${confirmId === `face-${f.id}` ? "bg-red-600" : "bg-black/60"}`}>
                      {confirmId === `face-${f.id}` ? <Check className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {facesLoaded && faces.length === 0 && <p className="mt-3 text-center text-[12px] font-bold text-ink/40">No faces yet — tap “Add faces” to upload one or several.</p>}
          </div>
        )}

        {tab === "curators" && (
          <div className="mt-2 grid grid-cols-1 gap-2 pb-16">
            {/* One shared file input — pickModelVideo() sets the target model, then opens it. */}
            <input ref={vidFileRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void uploadModelVideo(f); e.target.value = ""; }} />
            {shownCurators.length === 0 && <p className="py-10 text-center text-sm font-bold text-ink/40">No models yet.</p>}
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
                      {/* Real-model toggle — tap to add/remove the "✓ Real model" badge. */}
                      {!house && (
                        <button type="button" disabled={busy === `real-${c.id}`}
                          onClick={e => { e.stopPropagation(); void toggleRealModel(c); }}
                          title={(c.realModel || c.realBadge) ? "Real Model — tap to remove the badge" : "Not a real model — tap to mark as Real Model"}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black transition active:scale-95 disabled:opacity-50 ${(c.realModel || c.realBadge) ? "bg-emerald-500 text-white" : "bg-black/5 text-ink/40"}`}>
                          {busy === `real-${c.id}` ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : (c.realModel || c.realBadge) ? <Check className="h-2.5 w-2.5" /> : null}
                          {(c.realModel || c.realBadge) ? "Real ✓" : "Real: off"}
                        </button>
                      )}
                      {/* CONCEPT 2.0: which role model she emulates + whose face — so you know how to set her up. */}
                      {!house && (c.styleModelId || c.imageSource) && (
                        <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-black text-fuchsia-700" title="Role model she emulates + face source (own photos / our images)">
                          {c.styleModelId && curatorById.get(c.styleModelId) ? `🎭 like ${fullName(curatorById.get(c.styleModelId)!).split(" ")[0]}` : "🎭 own style"}
                          {c.imageSource === "ours" ? " · ✨ our face" : " · 📸 own face"}
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${sortC === "looks" ? "bg-cobalt/10 text-cobalt" : "bg-black/5 text-ink/50"}`}>{looksByCurator.get(c.id) ?? 0} looks</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${sortC === "tryons" ? "bg-cobalt/10 text-cobalt" : "bg-black/5 text-ink/50"}`}>{tryonsByCurator.get(c.id) ?? 0} try-ons</span>
                      {!house && typeof c.credits === "number" && <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-black text-ink/50">{c.credits} cr</span>}
                      {/* Engagement: comments on her posts · views (boost+real) · "See her in other looks" taps */}
                      {!house && (() => { const k = (n?: number) => (n ?? 0) >= 1000 ? `${((n ?? 0) / 1000).toFixed((n ?? 0) >= 10000 ? 0 : 1)}k` : String(n ?? 0); return (
                        <>
                          <span title="Kommentare auf ihren Posts" className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-black text-ink/50">💬 {k(c.commentCount)}</span>
                          <span title="Views (Boost + echt)" className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-black text-ink/50">👁 {k(c.viewTotal)}</span>
                          <span title="Wollten sie in anderen Looks sehen (Taps)" className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">✨ {k(c.tryonClicks)}</span>
                        </>
                      ); })()}
                      {!house && c.brands && <span className="truncate rounded-full bg-cobalt/10 px-2 py-0.5 text-[10px] font-black text-cobalt">{c.brands.split(",")[0]}</span>}
                    </div>
                    {!house && c.createdAt && <div className="mt-1 flex items-center gap-1 truncate text-[11px] font-bold text-ink/40"><Clock className="h-3 w-3 shrink-0" /> {fmtTs(c.createdAt)}</div>}
                  </div>
                  {!house && (
                    <div className="flex shrink-0 items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <button type="button" disabled={!!vidBusyId} onClick={() => pickModelVideo(c.id)} title="Video für dieses Model hochladen (z. B. aus Pixverse)"
                        className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 text-ink/60 active:scale-95 transition disabled:opacity-50">
                        {vidBusyId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                      </button>
                      <a href={`/admin/curators/apply?edit=${c.id}`} title="Edit the full model profile"
                        className="rounded-lg border border-black/10 px-2.5 py-1.5 text-[11px] font-black text-ink/60 active:scale-95 transition">Edit</a>
                      <button type="button" disabled={busy === c.id} onClick={() => void setCuratorStatus(c.id, (off || pending) ? "active" : "deactivated")} title={pending ? "Approve" : off ? "Activate" : "Deactivate"}
                        className={`grid h-9 w-9 place-items-center rounded-lg border active:scale-95 transition ${(off || pending) ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-black/10 text-ink/60"}`}>
                        <Power className="h-4 w-4" />
                      </button>
                      {/* Delete the model — two taps (arm → confirm) so it can't fire by accident. */}
                      <button type="button" disabled={busy === c.id} onClick={() => armOrRun(`del-${c.id}`, () => void deleteCurator(c.id))}
                        title={confirmId === `del-${c.id}` ? "Tap again to delete" : "Delete model"}
                        className={`grid h-9 w-9 place-items-center rounded-lg border active:scale-95 transition ${confirmId === `del-${c.id}` ? "border-red-300 bg-red-500 text-white" : "border-black/10 text-red-500"}`}>
                        {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmId === `del-${c.id}` ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
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
            {/* Premium subscribers (Stripe) — who is paying. */}
            <div className="mb-3 rounded-2xl border border-amber-300/60 bg-amber-50 p-3">
              <p className="flex items-center gap-1.5 text-sm font-black text-ink">👑 Premium subscribers <span className="text-ink/40">{subscribers === null ? "" : subscribers.length}</span></p>
              {subscribers === null ? (
                <div className="flex items-center gap-2 py-3 text-[12px] font-bold text-ink/40"><Loader2 className="h-4 w-4 animate-spin" /> Loading from Stripe…</div>
              ) : subscribers.length === 0 ? (
                <p className="py-2 text-[12px] font-bold text-ink/45">No active subscribers yet.</p>
              ) : (
                <div className="mt-2 flex flex-col gap-1.5">
                  {subscribers.map(s => (
                    <div key={s.email + s.created} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2">
                      <span className="min-w-0 truncate text-[13px] font-black text-ink">{s.email}</span>
                      <span className="flex shrink-0 items-center gap-2 text-[11px] font-bold text-ink/50">
                        <span className={`rounded-full px-1.5 py-px font-black uppercase ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : s.status === "trialing" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{s.status}</span>
                        <span>{new Date(s.created * 1000).toLocaleDateString()}</span>
                        <span>${(s.amount / 100).toFixed(0)}/mo</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

      {/* ── Insights tab — professional analytics dashboard (components/InsightsPro) ── */}
      {tab === "insights" && (
        <InsightsPro
          feedEvents={feedEvents}
          viewsByDay={viewsByDay}
          visitsByDay={visitsByDay}
          looks={looks.map(l => ({ id: l.id, name: l.name ?? "Look", thumb: (l.frontImageUrl || l.imageUrl || (l as any).videoPosterUrl || (l as any).tryOnImageUrl || "") as string }))}
          range={insightsRange}
          setRange={setInsightsRange}
          onReset={() => void resetAnalytics(false)}
          resetting={resetting}
        />
      )}

      {/* ── AI-face big view: enlarge, crop (in-place, keeps booking), or delete ── */}
      {bigFace && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4" onClick={e => { if (e.target === e.currentTarget) setBigFace(null); }}>
          <div className="flex w-full max-w-sm flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bigFace.imageUrl} alt="" className="max-h-[68vh] w-auto rounded-2xl object-contain" />
            <p className="mt-2 text-[12px] font-bold text-white/60">{bigFace.claimed ? "Booked by an influencer" : "Free — claimable for $3.99"}</p>
            {faceErr && <p className="mt-1 text-[12px] font-bold text-red-400">{faceErr}</p>}
            <div className="mt-3 grid w-full grid-cols-3 gap-2">
              <button type="button" onClick={() => void startFaceCrop()}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-white text-sm font-black text-black active:scale-95 transition"><Crop className="h-4 w-4" /> Crop</button>
              <button type="button" onClick={() => armOrRun(`bigdel-${bigFace.id}`, () => { const id = bigFace.id, cl = bigFace.claimed; setBigFace(null); void deleteFace(id, cl); })}
                className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-black text-white active:scale-95 transition ${confirmId === `bigdel-${bigFace.id}` ? "bg-red-600" : "bg-red-500/85"}`}>
                {confirmId === `bigdel-${bigFace.id}` ? <><Check className="h-4 w-4" /> Sure?</> : <><Trash2 className="h-4 w-4" /> Delete</>}</button>
              <button type="button" onClick={() => setBigFace(null)}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/25 text-sm font-black text-white active:scale-95 transition"><X className="h-4 w-4" /> Close</button>
            </div>
          </div>
        </div>
      )}
      {faceCropSrc && (
        <PhotoCropper src={faceCropSrc} aspect="portrait" onCancel={() => setFaceCropSrc("")} onDone={d => void saveFaceCrop(d)} />
      )}

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
              </div>
              {/* Real-model badge — clearly labelled toggle (the "✓ Real model" carousel badge). */}
              <div className="flex items-center justify-between gap-2 rounded-xl bg-panel p-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-wider text-ink/40">Real model badge</p>
                  <p className="text-[11px] font-bold text-ink/45">Shows the green “✓ Real model” badge — a real person, not an AI model.</p>
                </div>
                <button type="button" disabled={busy === `real-${edit.id}`} onClick={() => void toggleRealModel(edit)}
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-black active:scale-95 transition disabled:opacity-50 ${(edit.realModel || edit.realBadge) ? "bg-emerald-500 text-white" : "border border-black/10 bg-white text-ink/60"}`}>
                  {busy === `real-${edit.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {(edit.realModel || edit.realBadge) ? "Real ✓ — tap to remove" : "Mark as Real"}
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

      {tab === "chats" && (
        <div className="mt-4 space-y-4">
          {/* Global steering note — applied to EVERY model's chat persona. */}
          <section className="rounded-xl border border-black/10 bg-white p-4">
            <p className="flex items-center gap-1.5 text-sm font-black text-ink"><MessageCircle className="h-4 w-4" /> Global chat rules</p>
            <p className="mt-1 text-[12px] font-bold text-ink/45">Applied to every model on top of her own persona — e.g. safety, tone, always steer to trying a look. Hard safety limits are always enforced in code.</p>
            <textarea value={chatNoteDraft} onChange={e => setChatNoteDraft(e.target.value)} rows={4}
              placeholder={"e.g. Always be warm and encouraging. Gently suggest trying a look on LuxuryBandit. Never discuss other apps. Keep it classy."}
              className="mt-2 w-full resize-none rounded-lg border border-black/12 bg-black/[0.02] px-3 py-2 text-[13px] leading-snug text-ink outline-none focus:border-black/40" />
            <div className="mt-2 flex items-center gap-2">
              <button type="button" onClick={() => void saveChatNote()} disabled={chatNoteBusy || chatNoteDraft === chatGlobalNote}
                className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-black px-4 text-[13px] font-black text-white disabled:opacity-40 active:scale-95 transition">
                {chatNoteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save rules"}
              </button>
              {chatNoteDraft !== chatGlobalNote && <span className="text-[12px] font-bold text-amber-600">Unsaved</span>}
            </div>
          </section>

          {/* Send a "from a model" check-in → lands in the user's Messages + emails them. */}
          <section className="rounded-xl border border-black/10 bg-white p-4">
            <p className="flex items-center gap-1.5 text-sm font-black text-ink"><Send className="h-4 w-4" /> Message a user (as a model)</p>
            <p className="mt-1 text-[12px] font-bold text-ink/45">Sends a check-in from the model to a user — shows in their Messages and emails them.</p>
            {(() => {
              const opts = Array.from(new Map(modelChats.map(c => [c.curatorId, c.curatorName || "Model"])).entries());
              return (
                <div className="mt-3 grid gap-2">
                  <select value={dmCurator} onChange={e => setDmCurator(e.target.value)}
                    className="h-10 rounded-lg border border-black/12 bg-black/[0.02] px-3 text-[13px] font-bold text-ink outline-none focus:border-black/40">
                    <option value="">Choose a model…</option>
                    {opts.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                  <input value={dmEmail} onChange={e => setDmEmail(e.target.value)} placeholder="Recipient email (their login email)"
                    className="h-10 rounded-lg border border-black/12 bg-black/[0.02] px-3 text-[13px] font-bold text-ink outline-none focus:border-black/40" />
                  <textarea value={dmText} onChange={e => setDmText(e.target.value)} rows={2}
                    placeholder="Hey! How are you doing today? 💕"
                    className="w-full resize-none rounded-lg border border-black/12 bg-black/[0.02] px-3 py-2 text-[13px] leading-snug text-ink outline-none focus:border-black/40" />
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => void sendModelMessage()} disabled={dmBusy || !dmCurator || !dmEmail.trim() || !dmText.trim()}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-black px-4 text-[13px] font-black text-white disabled:opacity-40 active:scale-95 transition">
                      {dmBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send message"}
                    </button>
                    {dmMsg && <span className={`text-[12px] font-bold ${dmMsg.startsWith("Sent") ? "text-emerald-600" : "text-red-500"}`}>{dmMsg}</span>}
                  </div>
                </div>
              );
            })()}
          </section>

          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-black text-ink">Conversations <span className="text-ink/40">{modelChats.length}</span></p>
            <button type="button" onClick={() => void loadChats()} className="flex items-center gap-1 text-[12px] font-black text-ink/50"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
          </div>

          {!chatsLoaded ? (
            <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-ink/30" /></div>
          ) : modelChats.length === 0 ? (
            <p className="rounded-xl border border-black/10 bg-white py-16 text-center text-sm font-bold text-ink/40">No conversations yet.</p>
          ) : (
            <div className="space-y-2">
              {modelChats.map(c => {
                const openC = openChatId === c.id;
                const last = c.messages[c.messages.length - 1];
                return (
                  <div key={c.id} className="overflow-hidden rounded-xl border border-black/10 bg-white">
                    <button type="button" onClick={() => setOpenChatId(openC ? "" : c.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-black/[0.02]">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-black text-ink">{c.userName || "Guest"} <span className="font-bold text-ink/40">→ {c.curatorName || c.curatorId}</span></p>
                        <p className="truncate text-[12px] font-medium text-ink/50">{last ? `${last.role === "user" ? "" : "↩ "}${last.content}` : ""}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-bold text-ink/35">{new Date(c.updatedAt).toLocaleDateString()}</p>
                        <p className="text-[10px] font-bold text-ink/35">{c.messages.length} msgs</p>
                      </div>
                    </button>
                    {openC && (() => {
                      const de = germanChats[c.id];
                      return (
                      <div className="border-t border-black/10 bg-black/[0.015] px-3 py-3">
                        {/* Translate the whole conversation to German so you always understand it. */}
                        <button type="button" onClick={() => void translateChat(c)} disabled={translatingId === c.id}
                          className={`mb-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-black transition disabled:opacity-50 ${de ? "bg-black text-white" : "bg-black/[0.06] text-ink/70"}`}>
                          {translatingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>🌐</span>} {de ? "Original anzeigen" : "Auf Deutsch übersetzen"}
                        </button>
                        <div className="space-y-2">
                          {c.messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] font-medium ${m.role === "user" ? "rounded-tr-sm bg-black text-white" : "rounded-tl-sm bg-black/[0.06] text-ink"}`}>{de?.[i] ?? m.content}</div>
                            </div>
                          ))}
                        </div>

                        {/* Correction → appended to this model's chat persona (steers future replies). */}
                        <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-2.5">
                          <p className="mb-1.5 text-[11px] font-black text-ink/55">Korrektur / neue Regel für {c.curatorName || "sie"} (gilt für künftige Antworten):</p>
                          <textarea value={ruleDraft[c.curatorId] ?? ""} onChange={e => setRuleDraft(d => ({ ...d, [c.curatorId]: e.target.value }))} rows={2}
                            placeholder={"z.B. Erwähne nie andere Apps. Sei kürzer. Immer auf Try-on lenken."}
                            className="w-full resize-none rounded-lg border border-black/12 bg-white px-2.5 py-2 text-[12px] leading-snug text-ink outline-none focus:border-black/40" />
                          <div className="mt-1.5 flex items-center gap-2">
                            <button type="button" onClick={() => void addRule(c.curatorId)} disabled={ruleBusyId === c.curatorId || !(ruleDraft[c.curatorId] ?? "").trim()}
                              className="flex h-8 items-center justify-center gap-1 rounded-full bg-black px-3 text-[12px] font-black text-white disabled:opacity-40 active:scale-95 transition">
                              {ruleBusyId === c.curatorId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Regel hinzufügen"}
                            </button>
                            {ruleDoneId === c.curatorId && <span className="text-[12px] font-black text-emerald-600">Gespeichert ✓</span>}
                          </div>
                        </div>

                        <button type="button" onClick={() => void deleteChat(c.id)}
                          className="mt-3 flex items-center gap-1.5 text-[12px] font-black text-red-500 active:opacity-70"><Trash2 className="h-3.5 w-3.5" /> Delete conversation</button>
                      </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
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
