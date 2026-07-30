"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * REITER STATT EINER LANGEN ROLLE (Owner 30.07.2026: „ich brauche die galerie als tab oben
 * damit ich nicht immer runterscrollen muss").
 *
 * Die Admin-Ansicht war ein Stapel: Medien, Galerie, Models, Leads, Videos — untereinander.
 * Die Galerie ist das, was er am häufigsten ansieht, und sie lag als zweites unter einem
 * Werkzeug mit Vorschauvideos. Jeder Blick kostete Wischen.
 *
 * Jetzt: eine Reihe Reiter, die beim Scrollen oben stehen bleibt, und nur der gewählte
 * Bereich wird angezeigt. Welchen er zuletzt offen hatte, merkt sich das Gerät — beim
 * nächsten Öffnen ist er sofort dort.
 *
 * Die Inhalte kommen als fertige Bausteine von der Seite (Server), dieser Baustein entscheidet
 * nur, welcher sichtbar ist. So bleibt jede Werkzeugseite unverändert und muss nichts von den
 * Reitern wissen.
 */

export type AdminTab = { key: string; label: string; node: ReactNode };

export default function AdminTabs({ tabs, storageKey = "lb_admin_tab" }: {
  tabs: AdminTab[];
  storageKey?: string;
}) {
  const [aktiv, setAktiv] = useState(tabs[0]?.key ?? "");

  useEffect(() => {
    try {
      const gemerkt = localStorage.getItem(storageKey) ?? "";
      if (gemerkt && tabs.some(t => t.key === gemerkt)) setAktiv(gemerkt);
    } catch { /**/ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const waehlen = (k: string) => {
    setAktiv(k);
    try { localStorage.setItem(storageKey, k); } catch { /**/ }
  };

  return (
    <div>
      {/* Bleibt oben stehen: `sticky` klebt die Reihe unter die Kopfzeile, damit der Wechsel
          auch dann einen Tipp kostet, wenn er weit unten in einer Liste ist. */}
      <div className="sticky top-0 z-30 -mx-1 mb-3 flex gap-1.5 overflow-x-auto rounded-2xl bg-[#0d0b0a]/95 px-1 py-2 backdrop-blur">
        {tabs.map(t => (
          <button key={t.key} type="button" onClick={() => waehlen(t.key)}
            className="shrink-0 rounded-full px-3.5 py-2 text-[12px] font-black transition active:scale-95"
            style={aktiv === t.key
              ? { background: "#f6cf51", color: "#1a160f" }
              : { background: "rgba(255,255,255,0.08)", color: "#fff" }}>
            {t.label}
          </button>
        ))}
      </div>
      {/* Alle Bereiche bleiben im Baum, nur der gewählte ist sichtbar: So verlieren die
          Werkzeuge beim Wechseln weder ihren Ladezustand noch halb ausgefüllte Felder. */}
      {tabs.map(t => (
        <div key={t.key} className={aktiv === t.key ? "" : "hidden"}>{t.node}</div>
      ))}
    </div>
  );
}
