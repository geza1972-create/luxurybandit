"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle } from "lucide-react";
import { saveAuthSession, type SupabaseAuthSession } from "@/lib/supabase-auth-client";

export default function ConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const tokenType = params.get("token_type");
    const expiresAt = params.get("expires_at");

    // token_type is "bearer" for email confirmation
    if (accessToken && (tokenType === "bearer" || tokenType === "signup")) {
      try {
        // Parse user from JWT payload (base64 middle section)
        const parts = accessToken.split(".");
        const claims = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))) as {
          sub: string;
          email?: string;
        };
        const session: SupabaseAuthSession = {
          access_token: accessToken,
          refresh_token: refreshToken ?? undefined,
          expires_at: expiresAt ? Number(expiresAt) : undefined,
          user: { id: claims.sub, email: claims.email },
        };
        saveAuthSession(session);
        setStatus("success");
        // Return to where sign-in started (e.g. the funnel that triggered OAuth) so the
        // try-on can resume; otherwise the user's dashboard, not the feed. The dest is
        // read from sessionStorage (set before OAuth) — NOT the redirect URL — so it
        // can't be dropped by Supabase's redirect allowlist. ?returnTo= kept as fallback.
        let dest = "/user/dashboard";
        const ok = (p: string | null) => !!p && p.startsWith("/") && !p.startsWith("//");
        try {
          const stored = sessionStorage.getItem("lb_oauth_return");
          const rt = new URLSearchParams(window.location.search).get("returnTo");
          if (ok(stored)) dest = stored as string;
          else if (ok(rt)) dest = rt as string;
          sessionStorage.removeItem("lb_oauth_return");
        } catch { /**/ }
        setTimeout(() => router.push(dest), 1200);
      } catch {
        setStatus("error");
      }
    } else {
      setStatus("error");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-5">
      <div className="flex flex-col items-center gap-5 text-center max-w-xs">
        <p className="text-2xl font-black text-black">LuxuryBandit</p>

        {status === "loading" && (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-black/30" />
            <p className="text-sm font-bold text-black/40">Confirming your account…</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-base font-black text-black">Account confirmed! 🎉</p>
            <p className="text-sm font-bold text-black/50">You&apos;re signed in. One moment…</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-4xl">⚠️</div>
            <p className="text-base font-black text-black">Confirmation failed</p>
            <p className="text-sm font-bold text-black/50 leading-relaxed">
              The link is invalid or has expired. Please sign in or register again.
            </p>
            <button
              type="button"
              onClick={() => router.push("/stores?panel=account")}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-black text-sm font-black text-white active:scale-95 transition-transform"
            >
              Go to the app
            </button>
          </>
        )}
      </div>
    </div>
  );
}
