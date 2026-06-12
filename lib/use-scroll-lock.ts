"use client";

import { useEffect } from "react";

/**
 * Prevents the body from scrolling while an overlay is mounted.
 * Works on iOS Safari by using position:fixed (overflow:hidden alone doesn't work).
 * Restores the exact scroll position when the overlay unmounts.
 */
export function useScrollLock() {
  useEffect(() => {
    const y = window.scrollY;
    const body = document.body;
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.overscrollBehavior = "none";
    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.overscrollBehavior = "";
      window.scrollTo(0, y);
    };
  }, []);
}
