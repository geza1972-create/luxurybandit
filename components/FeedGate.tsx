"use client";

import { useState } from "react";
import { X, Loader2, Heart, MessageSquare } from "lucide-react";
import { signInWithPassword, signUpWithPassword } from "@/lib/supabase-auth-client";

// A bottom-sheet reachable from the feed. Two modes:
//  • "auth"     — create a free account or sign in (gates Follow/Save; drives registration)
//  • "feedback" — write us something → /api/contact (support inbox)
// Kept as one sheet so the feed has a single, visible place to register OR reach us.
export function FeedGate({
  mode,
  reason,
  onClose,
  onAuthed,
}: {
  mode: "auth" | "feedback";
  reason?: string; // short line explaining WHY the account is needed (e.g. "to follow")
  onClose: () => void;
  onAuthed?: () => void;
}) {
  const [tab, setTab] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<"" | "confirm" | "sent">("");

  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      if (tab === "signup") {
        const { session, confirmationRequired } = await signUpWithPassword(email.trim(), password);
        if (!session && confirmationRequired) { setDone("confirm"); setBusy(false); return; }
      } else {
        await signInWithPassword(email.trim(), password);
      }
      window.dispatchEvent(new Event("luxurybandit-auth-updated"));
      window.dispatchEvent(new Event("shopcut-gallery-updated"));
      onAuthed?.();
      onClose();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !message.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Feed user", email: email.trim(), reason: "App feedback", message: message.trim() }),
      });
      if (!r.ok) throw new Error("Could not send. Please try again.");
      setDone("sent");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not send. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const field = "h-12 w-full rounded-xl border border-black/12 bg-black/[0.02] px-4 text-sm font-bold text-black outline-none focus:border-black/40";

  return (
    <div className="lb-phone-col fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full rounded-t-3xl bg-white p-5 pb-8 shadow-2xl" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }} onClick={(e) => e.stopPropagation()}>
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
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email (optional, if you want a reply)" className={field} />
              {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-black text-red-600">{err}</p>}
              <button type="submit" disabled={busy || !message.trim()} className="flex h-12 items-center justify-center gap-2 rounded-full bg-black text-sm font-black text-white active:scale-95 transition-transform disabled:opacity-40">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
              </button>
            </form>
          )
        ) : done === "confirm" ? (
          <div className="py-8 text-center">
            <p className="text-lg font-black text-black">Almost there 📧</p>
            <p className="mt-1 text-sm font-bold text-black/50">Check your email to confirm your account, then come back and sign in.</p>
            <button type="button" onClick={() => { setDone(""); setTab("login"); }} className="mt-5 h-11 w-full rounded-full bg-black text-sm font-black text-white active:scale-95 transition-transform">Sign in</button>
          </div>
        ) : (
          <form onSubmit={submitAuth} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black text-white"><Heart className="h-5 w-5" fill="currentColor" /></div>
              <div>
                <p className="text-lg font-black leading-tight text-black">{tab === "signup" ? "Create your free account" : "Welcome back"}</p>
                <p className="text-[13px] font-bold leading-tight text-black/45">{reason || "Save your looks, follow curators & get your try-ons."}</p>
              </div>
            </div>
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={field} />
            <input type="password" autoComplete={tab === "signup" ? "new-password" : "current-password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className={field} />
            {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-black text-red-600">{err}</p>}
            <button type="submit" disabled={busy} className="flex h-12 items-center justify-center gap-2 rounded-full bg-black text-sm font-black text-white active:scale-95 transition-transform disabled:opacity-40">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (tab === "signup" ? "Create account" : "Sign in")}
            </button>
            <button type="button" onClick={() => { setErr(""); setTab(tab === "signup" ? "login" : "signup"); }} className="text-center text-[13px] font-bold text-black/50">
              {tab === "signup" ? "Have an account? Sign in" : "New here? Create a free account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
