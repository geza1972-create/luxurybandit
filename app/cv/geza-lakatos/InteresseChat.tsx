"use client";

import { useState } from "react";

/**
 * DAS INTERESSE-FORMULAR (Owner 27.08.2026) — ersetzt den blossen mailto-Knopf mit zwei
 * Feldern (Name, E-Mail), damit der Owner sofort eine Mail bekommt, statt auf einen
 * abgeschickten Mail-Client zu hoffen. Bewusst schlicht: kein Chat-Verlauf, keine Kennung,
 * keine Speicherung — dieselbe Haltung wie `/api/cv-interesse` selbst.
 */
export default function InteresseChat() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "ok" | "error">("idle");

  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  if (status === "ok") {
    return <p className="gl-interesse-danke">Danke! Ich melde mich bei dir.</p>;
  }

  return (
    <form
      className="gl-interesse"
      onSubmit={async e => {
        e.preventDefault();
        if (!name.trim() || !mailOk || status === "busy") return;
        setStatus("busy");
        try {
          const r = await fetch("/api/cv-interesse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name.trim(), email: email.trim() }),
          });
          setStatus(r.ok ? "ok" : "error");
        } catch {
          setStatus("error");
        }
      }}
    >
      <p className="gl-interesse-frage">Interesse an einer Zusammenarbeit? Wer bist du?</p>
      <div className="gl-interesse-row">
        <input
          className="gl-interesse-input"
          placeholder="Name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className="gl-interesse-input"
          type="email"
          placeholder="E-Mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <button className="gl-cta" type="submit" disabled={!name.trim() || !mailOk || status === "busy"}>
          {status === "busy" ? "Sende…" : "Interesse senden"}
        </button>
      </div>
      {status === "error" && <p className="gl-interesse-fehler">Ging gerade nicht — schreib direkt an geza.lakatos.ux@gmail.com.</p>}
    </form>
  );
}
