"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

// When signed in as admin (Studio PIN present), every public page is mirrored under
// /admin/… so the URL always shows admin mode. Each public route has a matching
// /admin/… page file (thin re-export), so this is a smooth client-side nav — no reload.
//
// Never mirrored: auth callbacks, payment returns, the studio PIN entry, API routes,
// and anything already under /admin.
const NO_MIRROR = ["/admin", "/auth", "/pay-done", "/payment", "/studio", "/api"];

// Exact paths that must not be mirrored because /admin/<same> is already a real,
// different admin dashboard (e.g. the public /curators recruiting page vs the admin
// curators dashboard). Their child paths (/curators/apply, …) still mirror fine.
const NO_MIRROR_EXACT = ["/curators"];

// These pages redirect themselves to their /admin twin (own useEffect), so skip them
// here to avoid a double redirect.
const SELF_MIRRORS = ["/stores", "/look", "/tryon"];

export default function AdminUrlMirror() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const p = pathname ?? "";
    if (p === "/" || p === "") return; // home redirects server-side already
    if (NO_MIRROR.some((x) => p === x || p.startsWith(x + "/"))) return;
    if (NO_MIRROR_EXACT.includes(p)) return;
    if (SELF_MIRRORS.some((x) => p === x || p.startsWith(x + "/"))) return;

    let pin = "";
    try { pin = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { /**/ }
    if (!pin) return; // not admin → leave the public URL alone

    router.replace(`/admin${p}${window.location.search}`);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
