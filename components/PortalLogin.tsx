"use client";

import { useState } from "react";

/**
 * DAS LOGIN-FELD DES PORTALS — eine Adresse, ein Knopf, eine Antwort.
 *
 * DIE ANTWORT IST IMMER DIESELBE, ob es ein Konto gibt oder nicht: Sonst verrät das Feld jedem,
 * welche Adressen bei uns Künstler sind. Ein Ladezustand, der endet ([[immer-close-einbauen]]).
 */
export default function PortalLogin({ lang, feld, knopf, gesendet, fehler }: {
  lang: string; feld: string; knopf: string; gesendet: string; fehler: string;
}) {
  const [mail, setMail] = useState("");
  const [stand, setStand] = useState<"frei" | "laeuft" | "gesendet" | "fehler">("frei");

  const schicken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stand === "laeuft" || !mail.trim()) return;
    setStand("laeuft");
    try {
      const res = await fetch("/api/portal-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mail: mail.trim(), lang }),
      });
      setStand(res.ok ? "gesendet" : "fehler");
    } catch {
      setStand("fehler");
    }
  };

  if (stand === "gesendet") return <p className="mt-8 border-l-2 border-[#111] pl-4 text-[16px] leading-[1.55]">{gesendet}</p>;

  return (
    <form onSubmit={schicken} className="mt-8">
      <label className="block text-[14px] font-semibold" htmlFor="portal-mail">{feld}</label>
      <input id="portal-mail" type="email" required autoComplete="email" value={mail} onChange={e => setMail(e.target.value)}
        className="mt-2 w-full border border-[#ccc] px-3.5 py-3 text-[16px] outline-none focus:border-[#111]" />
      <button type="submit" disabled={stand === "laeuft"}
        className="mt-4 w-full bg-[#111] px-6 py-3.5 text-[15px] font-semibold text-white disabled:opacity-60">
        {stand === "laeuft" ? "…" : knopf}
      </button>
      {stand === "fehler" && <p className="mt-3 text-[14.5px] font-semibold text-[#c02626]">{fehler}</p>}
    </form>
  );
}
