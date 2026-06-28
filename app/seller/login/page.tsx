"use client";

export const dynamic = "force-dynamic";

import { Loader2, MailCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

// Passwordless, email-only sign-in. Everyone on LuxuryBandit logs in the same way:
// enter your email, get a one-tap sign-in link (no password — the funnel never set
// one). We mint the magic link server-side and email it via our own mailbox
// (/api/send-look-link with no look = a plain "sign in" mail).
function LoginForm() {
  const params = useSearchParams();
  const confirmed = params.get("confirmed") === "1";
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const addr = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) { setError("Please enter a valid email."); return; }
    setError("");
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/confirm`;
      const res = await fetch("/api/send-look-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addr, redirectTo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not send the link.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-[#fafaf8] px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black text-white text-sm font-black tracking-tight">
            LB
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-black">LuxuryBandit</h1>
          <p className="mt-1 text-sm font-bold text-black/40">Sign in</p>
        </div>

        {confirmed && !sent && (
          <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm font-bold text-green-700">
            Email confirmed! Enter it below to get your sign-in link.
          </div>
        )}

        {sent ? (
          <div className="rounded-2xl border border-black/10 bg-white p-6 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-black text-white">
              <MailCheck className="h-6 w-6" />
            </div>
            <p className="mt-3 text-lg font-black text-black">Check your email ✨</p>
            <p className="mt-1.5 text-sm font-bold text-black/55">
              We sent a one-tap sign-in link to <span className="text-black">{email.trim()}</span>. Open it on this device to sign in — no password needed.
            </p>
            <button
              type="button"
              onClick={() => { setSent(false); }}
              className="mt-5 text-sm font-black text-black/50 underline underline-offset-2 active:opacity-70"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-1">
              <label className="text-xs font-black uppercase tracking-widest text-black/50">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoFocus
                required
                className="h-12 rounded-xl border border-black/12 bg-white px-4 text-sm font-bold text-black outline-none focus:border-black"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white disabled:opacity-60 active:scale-95 transition-transform"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Sending…" : "Email me a sign-in link"}
            </button>
            <p className="text-center text-xs font-bold text-black/40">
              No password needed — we email you a secure one-tap link.
            </p>
          </form>
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
