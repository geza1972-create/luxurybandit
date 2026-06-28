"use client";

export const dynamic = "force-dynamic";

import { Loader2, MailCheck } from "lucide-react";
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
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="#1877F2" d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08V12h3.05V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.95h-1.51c-1.49 0-1.96.93-1.96 1.88V12h3.33l-.53 3.47h-2.8v8.38C19.61 22.95 24 17.99 24 12z" /></svg>
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
  const [linkSent, setLinkSent] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);

  // Where to land after sign-in (e.g. back to the studio). Only internal paths.
  const rawReturn = params.get("returnTo") ?? "";
  const returnPath = rawReturn.startsWith("/") && !rawReturn.startsWith("//") ? rawReturn : "/user/myaccount";
  const redirectTo = typeof window !== "undefined"
    ? `${window.location.origin}/auth/confirm${rawReturn ? `?returnTo=${encodeURIComponent(returnPath)}` : ""}`
    : "";

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError("Please enter a valid email."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { session, confirmationRequired } = await signUpWithPassword(email.trim(), password, name.trim() || undefined);
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

  const handleMagicLink = async () => {
    setError("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError("Enter your email above first."); return; }
    setLinkLoading(true);
    try {
      const res = await fetch("/api/send-look-link", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), redirectTo }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? "Could not send link."); }
      setLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send link.");
    } finally {
      setLinkLoading(false);
    }
  };

  const oauthBtn = "flex h-12 items-center justify-center gap-2.5 rounded-xl border border-black/12 bg-white text-sm font-black text-black active:scale-95 transition-transform";

  return (
    <div className="flex min-h-screen items-start justify-center bg-[#fafaf8] px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black text-white text-sm font-black tracking-tight">LB</div>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-black">LuxuryBandit</h1>
          <p className="mt-1 text-sm font-bold text-black/40">{mode === "signup" ? "Create your account" : "Sign in"}</p>
        </div>

        {confirmed && <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm font-bold text-green-700">Email confirmed! Sign in below.</div>}

        {linkSent ? (
          <div className="rounded-2xl border border-black/10 bg-white p-6 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-black text-white"><MailCheck className="h-6 w-6" /></div>
            <p className="mt-3 text-lg font-black text-black">Check your email ✨</p>
            <p className="mt-1.5 text-sm font-bold text-black/55">We sent a one-tap sign-in link to <span className="text-black">{email.trim()}</span>.</p>
            <button type="button" onClick={() => setLinkSent(false)} className="mt-5 text-sm font-black text-black/50 underline underline-offset-2">Back</button>
          </div>
        ) : (
          <>
            {/* Social — fastest */}
            <div className="grid gap-2.5">
              <button type="button" onClick={() => signInWithOAuth("google", redirectTo)} className={oauthBtn}>
                <GoogleIcon /> Continue with Google
              </button>
              <button type="button" onClick={() => signInWithOAuth("facebook", redirectTo)} className={oauthBtn}>
                <FacebookIcon /> Continue with Facebook
              </button>
            </div>

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
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required
                className="h-12 rounded-xl border border-black/12 bg-white px-4 text-sm font-bold text-black outline-none focus:border-black" />

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{error}</p>}

              <button type="submit" disabled={loading}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white disabled:opacity-60 active:scale-95 transition-transform">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              </button>
            </form>

            <div className="mt-4 flex flex-col items-center gap-2">
              <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
                className="text-sm font-bold text-black/45">
                {mode === "signin" ? <>New here? <span className="font-black text-black underline underline-offset-2">Create an account</span></> : <>Already have an account? <span className="font-black text-black underline underline-offset-2">Sign in</span></>}
              </button>
              <button type="button" onClick={() => void handleMagicLink()} disabled={linkLoading}
                className="flex items-center gap-1.5 text-xs font-bold text-black/40 disabled:opacity-50">
                {linkLoading && <Loader2 className="h-3 w-3 animate-spin" />} Or email me a sign-in link instead
              </button>
            </div>
          </>
        )}
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
