"use client";

import { useEffect, useState } from "react";
import { isAdminEmail } from "@/lib/is-admin-email";
import { geraetAdresse } from "@/lib/guthaben-konto";

/**
 * EINE SEITE, DIE ES FÜR BESUCHER NICHT MEHR GIBT (Owner 05.08.2026: „die Model-Seite kommt
 * immer wieder, wenn ich auf Back klicke … du machst die Seite für User dicht. Die gibt es
 * nicht mehr, nur für den Admin").
 *
 * Wer kein Personal ist, wird zur Startseite geschickt — mit `replace`, nicht `push`: Sonst
 * liegt die alte Seite weiter im Verlauf, und genau darüber ist er gestolpert („kommt immer
 * wieder, wenn ich auf Back klicke"). `replace` nimmt sie aus dem Verlauf heraus.
 *
 * BIS DIE PRÜFUNG STEHT, WIRD NICHTS GEZEIGT. Ein kurzes Aufblitzen der Seite wäre genau das,
 * was der Owner nicht mehr sehen will.
 *
 * WAS DAS IST UND WAS NICHT: Es ist ein Vorhang, kein Schloss. Die Seite wird serverseitig
 * weiterhin gebaut, ihr Inhalt liegt also im ausgelieferten HTML — wer ihn wirklich sehen
 * will, kann es. Für den Zweck reicht das: Es geht darum, dass Kunden nicht dorthin geraten,
 * nicht darum, ein Geheimnis zu hüten. Zusammen mit dem entfernten Menüeintrag, dem Rauswurf
 * aus der Sitemap und `noindex` kommt dort niemand mehr an, der nicht die Adresse tippt.
 * Ein echtes Serverschloss braucht die Supabase-Sitzung im Seiten-Rendering — das ist ein
 * eigener Umbau und steht noch aus.
 */
export default function NurAdmin({ children }: { children: React.ReactNode }) {
  const [darf, setDarf] = useState<boolean | null>(null);

  useEffect(() => {
    let pin = "";
    try { pin = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { /**/ }
    let mail = "";
    try { mail = geraetAdresse(); } catch { /**/ }
    const ok = !!pin || isAdminEmail(mail);
    setDarf(ok);
    if (!ok) {
      try { window.location.replace("/"); } catch { /**/ }
    }
  }, []);

  if (darf !== true) return null;
  return <>{children}</>;
}
