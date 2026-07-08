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

  // Supabase puts the recovery token in the URL hash on redirect:
  // /auth/reset-password#access_token=xxx&token_type=recovery&...
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.slice(1); // strip leading #
    const params = new URLSearchParams(hash);
    setAccessToken(params.get("access_token"));
    setTokenType(params.get("token_type"));
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

        {done ? (
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
              onClick={() => router.push("/stores?panel=account")}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-black text-sm font-black text-white active:scale-95 transition-transform"
            >
              Back to the app
            </button>
          </div>
        ) : !accessToken && tokenType === null ? (
          /* Still reading hash (or no token at all) */
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-black/30" />
            <p className="text-sm font-bold text-black/40">Loading…</p>
          </div>
        ) : !accessToken ? (
          /* No token found */
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 text-3xl">🔗</div>
            <p className="text-base font-black text-black">No valid link</p>
            <p className="text-sm font-bold text-black/50 max-w-xs leading-relaxed">
              Open this link directly from the LuxuryBandit email. It's valid only once.
            </p>
            <button
              type="button"
              onClick={() => router.push("/stores?panel=account")}
              className="flex h-12 w-full items-center justify-center rounded-2xl border border-black/10 text-sm font-black text-black active:bg-black/5 transition"
            >
              Back to the app
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
