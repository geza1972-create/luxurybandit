"use client";

import { useState } from "react";
import { X, Loader2, Heart, MessageSquare } from "lucide-react";
import { signInWithPassword, signUpWithPassword } from "@/lib/supabase-auth-client";
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
}: {
  mode: "auth" | "feedback";
  reason?: string;
  lookId?: string;
  lookName?: string;
  onClose: () => void;
  onAuthed?: () => void;
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
    // Capture the lead (with the name) → funnel + admin Users list.
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
    if (busy || !message.trim()) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "Feed user", email: email.trim(), reason: "App feedback", message: message.trim() }),
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
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email (optional, if you want a reply)" className={field} />
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
