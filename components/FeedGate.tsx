"use client";

import { useState } from "react";
import { X, Loader2, Heart, MessageSquare } from "lucide-react";
import { signInWithPassword, signUpWithPassword, signInWithOAuth } from "@/lib/supabase-auth-client";
import { trackMetaPixel } from "@/lib/meta-pixel";

// A bottom-sheet reachable from the feed. Two modes:
//  • "auth"     — the SAME registration as the try-on gate: name + email + password,
//                 one submit (sign up, or sign in if the email already exists), plus a
//                 lead capture for the funnel/admin Users list.
//  • "feedback" — write us something → /api/contact (support inbox).
export function FeedGate({
  mode,
  reason,
  lookId,
  lookName,
  onClose,
  onAuthed,
  advanceOnSignup,
}: {
  mode: "auth" | "feedback";
  reason?: string;
  lookId?: string;
  lookName?: string;
  onClose: () => void;
  onAuthed?: () => void;
  // When true, a fresh signup that still needs email confirmation ALSO proceeds
  // (calls onAuthed) instead of stopping at a "check your email" message. Used by the
  // Try-On funnel so the flow continues to the plans step after registering.
  advanceOnSignup?: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [done, setDone] = useState<"" | "sent">("");

  // Same flow as the try-on gate (gateRegister): capture a lead, then create the account
  // — or sign in if the email already exists (single form, no separate login toggle).
  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const mail = email.trim().toLowerCase();
    const nm = name.trim();
    if (!nm || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail) || password.length < 6) {
      setErr("Bitte Name, gültige E-Mail und ein Passwort (min. 6 Zeichen) angeben.");
      return;
    }
    setBusy(true); setErr(""); setInfo("");
    // Capture the lead (with the name) → funnel + admin Users list. (Age is handled by the
    // global 18+ AgeGate as a yes/no on entry — no birthdate is collected.)
    void fetch("/api/try-this-look", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lead", email: mail, customerName: nm, lookId: lookId || "", lookName: lookName || "", leadSource: "feed", marketingConsent: true, visitorId: "anon" }),
    }).catch(() => {});
    const finish = () => {
      window.dispatchEvent(new Event("luxurybandit-auth-updated"));
      window.dispatchEvent(new Event("shopcut-gallery-updated"));
      trackMetaPixel("Lead", { content_category: "feed" });
      onAuthed?.();
      onClose();
    };
    try {
      const { session, confirmationRequired } = await signUpWithPassword(mail, password, nm);
      if (session) { trackMetaPixel("CompleteRegistration", { content_category: "feed" }); return finish(); }
      if (confirmationRequired) {
        // Funnel: registration is enough to continue (email can be confirmed later).
        if (advanceOnSignup) { trackMetaPixel("CompleteRegistration", { content_category: "feed" }); return finish(); }
        setInfo("Wir haben dir eine Bestätigungs-Mail geschickt. Bestätige deine E-Mail und melde dich dann an.");
        setBusy(false);
        return;
      }
    } catch {
      // Email already registered → sign in with the given password.
      try { const s = await signInWithPassword(mail, password); if (s) return finish(); } catch { /**/ }
      setErr("E-Mail schon registriert oder Passwort falsch. Bitte anderes Passwort / einloggen.");
      setBusy(false);
      return;
    }
    setBusy(false);
  };

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    const mail = email.trim();
    if (busy || !message.trim()) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { setErr("Please add your email so we can reply."); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // reason must be one of the API's allowed values (support/complaint/general).
        body: JSON.stringify({ name: name.trim() || "Feed user", email: mail, reason: "general", message: `[App feedback] ${message.trim()}` }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || "Could not send. Please try again.");
      setDone("sent");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not send. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const field = "h-12 w-full rounded-xl border border-black/12 bg-black/[0.02] px-4 text-sm font-bold text-black outline-none focus:border-black/40";

  return (
    <div className="lb-phone-col fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full rounded-t-3xl bg-white p-5 shadow-2xl" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }} onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15" />
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-black/40 active:bg-black/5">
          <X className="h-5 w-5" />
        </button>

        {mode === "feedback" ? (
          done === "sent" ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600"><MessageSquare className="h-6 w-6" /></div>
              <p className="text-lg font-black text-black">Thank you! 💛</p>
              <p className="mt-1 text-sm font-bold text-black/50">We read every message.</p>
              <button type="button" onClick={onClose} className="mt-5 h-11 w-full rounded-full bg-black text-sm font-black text-white active:scale-95 transition-transform">Done</button>
            </div>
          ) : (
            <form onSubmit={submitFeedback} className="flex flex-col gap-3">
              <div>
                <p className="text-lg font-black text-black">Tell us anything</p>
                <p className="text-[13px] font-bold text-black/45">Feedback, a wish, a bug — we want to hear it.</p>
              </div>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Your message…" className="w-full rounded-xl border border-black/12 bg-black/[0.02] p-4 text-sm font-bold text-black outline-none focus:border-black/40" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email (so we can reply)" className={field} />
              {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-black text-red-600">{err}</p>}
              <button type="submit" disabled={busy || !message.trim()} className="flex h-12 items-center justify-center gap-2 rounded-full bg-black text-sm font-black text-white active:scale-95 transition-transform disabled:opacity-40">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
              </button>
            </form>
          )
        ) : (
          <form onSubmit={submitAuth} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black text-white"><Heart className="h-5 w-5" fill="currentColor" /></div>
              <div>
                <p className="text-lg font-black leading-tight text-black">Create your free account</p>
                <p className="text-[13px] font-bold leading-tight text-black/45">{reason || "Save your looks, follow curators & manage your try-ons."}</p>
              </div>
            </div>
            {/* Fastest: social sign-in (same as the account panel). */}
            <button type="button" onClick={() => { try { sessionStorage.setItem("lb_oauth_return", window.location.pathname + window.location.search); } catch { /**/ } signInWithOAuth("google", `${window.location.origin}/auth/confirm`); }}
              className="flex h-12 items-center justify-center gap-2.5 rounded-xl border border-black/12 bg-white text-sm font-black text-black active:scale-95 transition-transform">
              <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Continue with Google
            </button>
            {/* Facebook sign-in removed per request. */}
            <div className="my-1 flex items-center gap-3">
              <span className="h-px flex-1 bg-black/10" />
              <span className="text-[11px] font-black uppercase tracking-wider text-black/30">or</span>
              <span className="h-px flex-1 bg-black/10" />
            </div>
            <input type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={field} />
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={field} />
            <input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min. 6 characters)" className={field} />
            {info && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] font-black text-amber-700">{info}</p>}
            {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-black text-red-600">{err}</p>}
            <button type="submit" disabled={busy} className="flex h-12 items-center justify-center gap-2 rounded-full bg-black text-sm font-black text-white active:scale-95 transition-transform disabled:opacity-40">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
            </button>
            <p className="text-center text-[11px] font-bold text-black/35">Already have an account? Use the same form — we sign you in automatically.</p>
          </form>
        )}
      </div>
    </div>
  );
}
