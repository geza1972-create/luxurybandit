"use client";

import { useEffect, useState } from "react";

// The whole portal is 18+. This blocks EVERY page (it mounts in the root layout, above
// all content) until the visitor confirms a date of birth that is 18 or older. Once
// confirmed we remember it in localStorage so it only appears once per device. Admins
// (who carry the try-look PIN) are never gated.
const OK_KEY = "lb_age_verified";
const DOB_KEY = "lb_dob";
const ADMIN_KEYS = ["luxurybandit-try-look-admin-pin", "x-try-look-admin-pin"];

function ageFromDob(dob: string): number | null {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export default function AgeGate() {
  // Render nothing until mounted so we never hydrate a mismatched overlay.
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [dob, setDob] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setReady(true);
    try {
      if (localStorage.getItem(OK_KEY) === "1") return;
      if (ADMIN_KEYS.some((k) => localStorage.getItem(k))) return; // admins bypass
    } catch { /* localStorage blocked → still gate */ }
    setOpen(true);
  }, []);

  if (!ready || !open) return null;

  const today = new Date().toISOString().slice(0, 10);

  const confirm = () => {
    setErr("");
    if (!dob) { setErr("Bitte gib dein Geburtsdatum an."); return; }
    const age = ageFromDob(dob);
    if (age === null) { setErr("Bitte gib ein gültiges Datum an."); return; }
    if (age < 18) { setErr("Du musst mindestens 18 Jahre alt sein, um LuxuryBandit zu nutzen."); return; }
    try {
      localStorage.setItem(OK_KEY, "1");
      localStorage.setItem(DOB_KEY, dob);
    } catch { /* ignore */ }
    setOpen(false);
  };

  return (
    <div className="lb-phone-col fixed inset-0 z-[120] flex items-end justify-center bg-black/70 backdrop-blur-md">
      <div className="relative w-full rounded-t-3xl bg-white p-6 shadow-2xl" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.75rem)" }}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/15" />
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-black px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white">18+</div>
        <p className="mt-2 text-xl font-black leading-tight text-black">Bestätige dein Alter</p>
        <p className="mt-1.5 text-[13px] font-bold leading-relaxed text-black/55">
          LuxuryBandit ist ausschließlich für Erwachsene (18+). Bitte gib dein Geburtsdatum an,
          um fortzufahren.
        </p>
        <label className="mt-4 block text-[11px] font-black uppercase tracking-wide text-black/45">Geburtsdatum</label>
        <input
          type="date"
          value={dob}
          max={today}
          onChange={(e) => setDob(e.target.value)}
          className="mt-1.5 h-12 w-full rounded-xl border border-black/12 bg-black/[0.02] px-4 text-sm font-bold text-black outline-none focus:border-black/40"
        />
        {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-black text-red-600">{err}</p>}
        <button
          type="button"
          onClick={confirm}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-black text-sm font-black text-white transition-transform active:scale-95"
        >
          Ich bin 18 oder älter — weiter
        </button>
        <p className="mt-3 text-center text-[11px] font-bold text-black/35">
          Mit dem Fortfahren bestätigst du, dass du mindestens 18 Jahre alt bist.
        </p>
      </div>
    </div>
  );
}
