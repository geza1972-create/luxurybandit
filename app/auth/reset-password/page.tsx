"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, KeyRound, CheckCircle } from "lucide-react";
import { updatePasswordWithToken } from "@/lib/supabase-auth-client";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenType, setTokenType] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState(false);   // hash has been read (else we'd spin forever)
  const [linkError, setLinkError] = useState(""); // Supabase error in the hash (e.g. expired)

  // Supabase puts the session in the URL hash on redirect, e.g.:
  // /auth/reset-password#access_token=xxx&token_type=bearer&type=recovery&...
  // NOTE: token_type is always "bearer"; the FLOW is in the separate `type` param
  // (type=recovery). Checking token_type for "recovery" was the "Invalid link" bug.
  // An expired/used link redirects with #error=...&error_description=... and NO token.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.hash.slice(1));
    setAccessToken(params.get("access_token"));
    setTokenType(params.get("type"));
    const desc = params.get("error_description") || params.get("error");
    if (desc) setLinkError(decodeURIComponent(desc.replace(/\+/g, " ")));
    setParsed(true);
  }, []);

  const handleSubmit = async () => {
    setError("");
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (!accessToken) {
      setError("Invalid or expired link. Please request a new one.");
      return;
    }
    setLoading(true);
    try {
      await updatePasswordWithToken(accessToken, password);
      setDone(true);
      // Redirect to home after 3 seconds
      setTimeout(() => router.push("/stores?panel=account"), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change your password.");
    } finally {
      setLoading(false);
    }
  };

  // Invalid link (no token or wrong type)
  const isInvalid = accessToken !== null && tokenType !== null && tokenType !== "recovery";

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-5">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <p className="text-2xl font-black tracking-tight text-black">LuxuryBandit</p>
          <p className="mt-1 text-sm font-bold text-black/40">Set a new password</p>
        </div>

        {!parsed ? (
          /* Still reading the hash — brief. */
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-black/30" />
            <p className="text-sm font-bold text-black/40">Loading…</p>
          </div>
        ) : done ? (
          /* Success */
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-base font-black text-black">Password changed!</p>
            <p className="text-sm font-bold text-black/50">
              Redirecting you now…
            </p>
          </div>
        ) : isInvalid ? (
          /* Wrong token type */
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-3xl">⚠️</div>
            <p className="text-base font-black text-black">Invalid link</p>
            <p className="text-sm font-bold text-black/50">
              This link isn't for resetting your password.
            </p>
            <button
              type="button"
              onClick={() => router.push("/seller/login")}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-black text-sm font-black text-white active:scale-95 transition-transform"
            >
              Back to sign in
            </button>
          </div>
        ) : !accessToken ? (
          /* No/expired token — reset links are single-use and expire quickly. */
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 text-3xl">⌛</div>
            <p className="text-base font-black text-black">Link expired</p>
            <p className="text-sm font-bold text-black/50 max-w-xs leading-relaxed">
              {linkError || "This reset link is invalid or has already been used — they work only once and expire quickly. Request a fresh one."}
            </p>
            <button
              type="button"
              onClick={() => router.push("/seller/login")}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-black text-sm font-black text-white active:scale-95 transition-transform"
            >
              Request a new link
            </button>
          </div>
        ) : (
          /* Main form */
          <div className="grid gap-4">
            <div className="flex flex-col items-center gap-2 mb-2 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-black text-white">
                <KeyRound className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-black/50">Enter your new password.</p>
            </div>

            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-2xl border border-black/10 bg-black/[0.02] px-4 text-sm font-bold text-black placeholder:text-black/30 outline-none focus:border-black"
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleSubmit(); }}
              className="h-12 rounded-2xl border border-black/10 bg-black/[0.02] px-4 text-sm font-bold text-black placeholder:text-black/30 outline-none focus:border-black"
            />

            {error && (
              <p className="text-xs font-bold text-red-500 text-center">{error}</p>
            )}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={loading || !password || !confirm}
              className="flex h-13 items-center justify-center rounded-2xl bg-black py-3.5 text-sm font-black text-white disabled:opacity-40 active:scale-95 transition-transform"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save password"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/stores?panel=account")}
              className="text-center text-xs font-bold text-black/35 underline underline-offset-2"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
