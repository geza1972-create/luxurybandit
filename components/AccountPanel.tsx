"use client";

import { getStoredAuthSession, signInWithPassword, signOut, signUpWithPassword, type SupabaseAuthSession } from "@/lib/supabase-auth-client";
import { LogOut, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

export function AccountPanel() {
  const [session, setSession] = useState<SupabaseAuthSession | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const syncSession = () => setSession(getStoredAuthSession());
    syncSession();
    window.addEventListener("luxurybandit-auth-updated", syncSession);
    return () => window.removeEventListener("luxurybandit-auth-updated", syncSession);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const nextSession =
        mode === "login"
          ? await signInWithPassword(email.trim(), password)
          : await signUpWithPassword(email.trim(), password);
      setSession(nextSession);
      setMessage("Account is active. Your gallery now saves under this login.");
      window.dispatchEvent(new Event("shopcut-gallery-updated"));
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Account action failed.");
    } finally {
      setIsBusy(false);
    }
  };

  if (session) {
    return (
      <div className="rounded-md border border-cobalt/20 bg-cobalt/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-cobalt text-white">
              <UserRound aria-hidden="true" className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-black text-ink">Signed in</div>
              <div className="text-xs font-bold text-ink/55">{session.user.email ?? "LuxuryBandit account"}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              signOut();
              setSession(null);
              window.dispatchEvent(new Event("shopcut-gallery-updated"));
            }}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-3 text-xs font-black text-ink"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-md border border-black/10 bg-white p-3 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-ink">Account</div>
          <p className="mt-1 text-xs font-bold leading-5 text-ink/55">
            Sign in so uploads, apparel assets, and designs are saved under your account.
          </p>
        </div>
        <div className="grid grid-cols-2 overflow-hidden rounded-md border border-black/10 bg-panel p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`h-8 rounded px-3 text-xs font-black ${mode === "login" ? "bg-ink text-white" : "text-ink/55"}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`h-8 rounded px-3 text-xs font-black ${mode === "signup" ? "bg-ink text-white" : "text-ink/55"}`}
          >
            Create
          </button>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="email"
          required
          className="h-11 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold text-ink outline-none focus:border-cobalt"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="password"
          required
          minLength={6}
          className="h-11 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold text-ink outline-none focus:border-cobalt"
        />
        <button
          type="submit"
          disabled={isBusy}
          className="h-11 rounded-md bg-cobalt px-5 text-sm font-black text-white disabled:cursor-wait disabled:opacity-50"
        >
          {isBusy ? "Please wait" : mode === "login" ? "Login" : "Create account"}
        </button>
      </div>
      {message && <p className="rounded-md border border-cobalt/20 bg-cobalt/10 p-2 text-xs font-black text-cobalt">{message}</p>}
      {error && <p className="rounded-md border border-coral/25 bg-coral/10 p-2 text-xs font-black text-coral">{error}</p>}
    </form>
  );
}
