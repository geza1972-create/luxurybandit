"use client";

export const dynamic = "force-dynamic";

import { Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { signInWithPassword, signUpWithPassword, signInWithOAuth } from "@/lib/supabase-auth-client";

// Google "G" mark
const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

function LoginForm() {
  const params = useSearchParams();
  const confirmed = params.get("confirmed") === "1";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false); // reveal the password field
  const [agree, setAgree] = useState(false); // Terms & Privacy — required to create an account
  const [news, setNews] = useState(true);     // Product news & updates — opt-in, on by default
  const [message, setMessage] = useState(""); // success notice (e.g. password-reset email sent)
  const [resetLoading, setResetLoading] = useState(false);

  // Where to land after sign-in (e.g. back to the studio). Only internal paths.
  const rawReturn = params.get("returnTo") ?? "";
  const returnPath = rawReturn.startsWith("/") && !rawReturn.startsWith("//") ? rawReturn : "/user/dashboard";
  // Clean redirect URL (always allowlisted); the post-login destination is stashed in
  // sessionStorage so Supabase's allowlist can't drop it.
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/confirm` : "";
  const oauth = (provider: "google") => {
    try { if (rawReturn) sessionStorage.setItem("lb_oauth_return", returnPath); } catch { /**/ }
    signInWithOAuth(provider, redirectTo);
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError("Please enter a valid email."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (mode === "signup" && !agree) { setError("Please accept the Terms & Privacy Policy to continue."); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { session, confirmationRequired } = await signUpWithPassword(email.trim(), password, name.trim() || undefined, { marketingOptIn: news });
        if (session) { window.location.href = returnPath; return; }
        if (confirmationRequired) { setError("Account created — check your email to confirm, then sign in."); setMode("signin"); return; }
      } else {
        await signInWithPassword(email.trim(), password);
        window.location.href = returnPath;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Forgot password → mint a recovery link (Admin API) and email it via our mailer.
  // Supabase's native /recover is broken on this project, so we don't use it.
  const handleForgot = async () => {
    setError(""); setMessage("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError("Enter your email above first, then tap reset."); return; }
    const resetRedirect = typeof window !== "undefined" ? `${window.location.origin}/auth/reset-password` : "";
    setResetLoading(true);
    try {
      const res = await fetch("/api/send-reset-link", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), redirectTo: resetRedirect }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Could not send reset email.");
      if (d.sent) setMessage("Password reset link sent — check your email.");
      // Don't reveal whether an account exists; show the same copy even if skipped
      // because the account was unknown. Only a real mailer/config failure differs.
      else if (d.skipped === "no-mailer" || d.skipped === "no-supabase-admin") setError("Email isn't set up yet — please contact support to reset your password.");
      else setMessage("If that email has an account, a reset link is on its way.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setResetLoading(false);
    }
  };

  const oauthBtn ="flex h-12 items-center justify-center gap-2.5 rounded-xl border border-black/12 bg-white text-sm font-black text-black active:scale-95 transition-transform";

  return (
    <div className="flex min-h-screen items-start justify-center bg-[#fafaf8] px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* Logo → homepage */}
          <Link href="/home" aria-label="Go to LuxuryBandit home" className="inline-flex flex-col items-center active:scale-95 transition">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black text-white text-sm font-black tracking-tight">LB</span>
            <span className="mt-3 text-2xl font-black tracking-tight text-black">LuxuryBandit</span>
          </Link>
          <p className="mt-1 text-sm font-bold text-black/40">{mode === "signup" ? "Create your account" : "Sign in"}</p>
        </div>

        {confirmed && <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm font-bold text-green-700">Email confirmed! Sign in below.</div>}

        {/* Social — fastest */}
        <div className="grid gap-2.5">
          <button type="button" onClick={() => oauth("google")} className={oauthBtn}>
            <GoogleIcon /> Continue with Google
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] font-bold leading-relaxed text-black/40">
          By continuing you agree to our{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-black/60 underline underline-offset-2">Terms</a> &amp;{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-black/60 underline underline-offset-2">Privacy Policy</a>, and to receive news &amp; updates from us.
        </p>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-black/10" />
          <span className="text-xs font-black uppercase tracking-wider text-black/30">or</span>
          <div className="h-px flex-1 bg-black/10" />
        </div>

        <form onSubmit={handlePassword} className="grid gap-3">
              {mode === "signup" && (
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                  className="h-12 rounded-xl border border-black/12 bg-white px-4 text-sm font-bold text-black outline-none focus:border-black" />
              )}
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required
                className="h-12 rounded-xl border border-black/12 bg-white px-4 text-sm font-bold text-black outline-none focus:border-black" />
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required
                  className="h-12 w-full rounded-xl border border-black/12 bg-white pl-4 pr-12 text-sm font-bold text-black outline-none focus:border-black" />
                <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 grid w-12 place-items-center text-black/40 active:scale-90 transition">
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {mode === "signup" && (
                <div className="mt-0.5 grid gap-2.5">
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-black" />
                    <span className="text-[12px] font-bold leading-snug text-black/55">
                      I accept the{" "}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-black underline underline-offset-2">Terms &amp; Conditions</a>{" "}
                      and{" "}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-black underline underline-offset-2">Privacy Policy</a>.
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input type="checkbox" checked={news} onChange={e => setNews(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-black" />
                    <span className="text-[12px] font-bold leading-snug text-black/55">Email me news, offers and product updates.</span>
                  </label>
                </div>
              )}

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{error}</p>}
              {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{message}</p>}

              <button type="submit" disabled={loading || (mode === "signup" && !agree)}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white disabled:opacity-40 active:scale-95 transition-transform">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              </button>
            </form>

        <div className="mt-4 flex flex-col items-center gap-2">
          <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }}
            className="text-sm font-bold text-black/45">
            {mode === "signin" ? <>New here? <span className="font-black text-black underline underline-offset-2">Create an account</span></> : <>Already have an account? <span className="font-black text-black underline underline-offset-2">Sign in</span></>}
          </button>
          {mode === "signin" && (
            <button type="button" onClick={() => void handleForgot()} disabled={resetLoading}
              className="flex items-center gap-1.5 text-xs font-bold text-black/40 disabled:opacity-50">
              {resetLoading && <Loader2 className="h-3 w-3 animate-spin" />} Forgot your password?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SellerLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
