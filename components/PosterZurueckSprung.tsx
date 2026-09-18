"use client";

import { useEffect } from "react";

/**
 * ZURÜCK AN DIE STELLE, VON DER ER LOSGING (Owner 18.09.2026: „muss genau zu der stelle springen
 * in der seite, wo er war" · „ich meinte vom stripe").
 *
 * ── WARUM NICHT EINFACH `#w-3` ──────────────────────────────────────────────────────────────
 *
 * Eine Marke in der Adresse reicht hier nicht: Stripe schneidet sie bei manchen Wegen ab, und
 * selbst wenn sie ankommt, springt der Browser, BEVOR die Werkbilder geladen sind — danach
 * wächst die Seite unter ihm, und er steht wieder oben. GEMESSEN am 18.09.2026: Rückkehr aus der
 * Kasse landete am Seitenanfang.
 *
 * Deshalb reist die Stelle als `?zu=w-3` mit (eine Marke überlebt keine Umleitung, ein
 * Abfrageteil schon), und gesprungen wird hier — nach dem Aufbau, und noch ein paar Mal, solange
 * die Bilder die Seite noch verschieben.
 */
export default function PosterZurueckSprung() {
  useEffect(() => {
    const ziel = new URLSearchParams(window.location.search).get("zu")
      || window.location.hash.replace(/^#/, "");
    if (!ziel || !/^[a-z0-9-]{1,40}$/i.test(ziel)) return;

    let versuche = 0;
    let uhr = 0;
    const springen = () => {
      const el = document.getElementById(ziel);
      if (el) el.scrollIntoView({ block: "start" });
      /* Die Werkbilder laden nach und schieben die Seite — GEMESSEN am 18.09.2026: nach zwei
         Sekunden stand die Kachel noch 212 px zu tief. Deshalb bis vier Sekunden nachziehen und
         zusätzlich, sobald der Browser „alles geladen" meldet. */
      if (++versuche < 12) uhr = window.setTimeout(springen, versuche < 4 ? 120 : 400);
    };
    springen();
    /* `load` kommt, wenn auch die Bilder stehen — danach verschiebt sich nichts mehr. */
    const nachLaden = () => springen();
    window.addEventListener("load", nachLaden);
    return () => { window.clearTimeout(uhr); window.removeEventListener("load", nachLaden); };
  }, []);

  return null;
}
