"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

/** Meldet einen privaten Link und macht ihn sofort unbrauchbar. Kein Login nötig — wer den
 *  Link hat, muss ihn abschalten können. */
export default function RevokeButton({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const revoke = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/surprise-send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revoke: token }),
      });
      setDone(r.ok);
    } catch { /**/ }
    setBusy(false);
  };

  if (done) return <p className="mt-6 text-[15px] font-black text-[#f6cf51]">Deleted. The link no longer works.</p>;

  return (
    <button type="button" onClick={() => void revoke()} disabled={busy}
      className="lb-gold mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-black active:scale-95 transition disabled:opacity-60">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete this link now
    </button>
  );
}
