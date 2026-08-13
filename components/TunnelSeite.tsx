"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Laden } from "@/components/CI";
import { aktiveAdresse } from "@/lib/guthaben-konto";
import { logTunnelEvent } from "@/lib/track-funnel";

/**
 * DAS EINE GERÜST FÜR JEDE TUNNEL-SEITE (Owner 12.08.2026, „oberstes Gesetz": „allle funnels
 * und wenn eine änderung bitbs dann ist es bei allen gleich. ich will da nicht mehr einzeln
 * rum bauen." — siehe KONZEPT-TUNNEL.md §„Das oberste Gesetz").
 *
 * WARUM DIESER BAUSTEIN EXISTIERT: Die erste Fassung (Versprechen) hatte die URL-Schritt-
 * Logik — Bekannte überspringen Schritt 1, vor/zurück über die Adresszeile, `router.push`
 * beim Vorwärtsgehen (Handy-Zurück-Geste), `router.replace` beim Rückwärtsgehen — direkt in
 * einer eigenen `VersprechenStartClient.tsx`. Beim zweiten Produkt (Kuss/Geburtstag) wäre
 * genau diese Logik ein zweites Mal entstanden, und beim dritten ein drittes Mal — der
 * Owner will das nicht: EINE Änderung an dieser Mechanik soll an EINER Stelle passieren.
 *
 * WAS DIESER BAUSTEIN NICHT WEISS: Er kennt weder `KissFunnel` noch `EinladungBauen` — er
 * kennt nur EINE Zahl (`schritt`) und eine Funktion, sie zu ändern (`onSchrittChange`). Wer
 * ihn benutzt, reicht `children` als Funktion herein (Render-Prop) und bekommt die beiden
 * Werte darüber herein; er verdrahtet sie an die Funnel-Komponente seines Produkts. Genau
 * deshalb kann eine ZWEITE Runde (Hochzeit/Urlaub/Gutschein auf `EinladungBauen`-Basis)
 * diesen Baustein NUR LESEN und trotzdem benutzen, ohne dass er etwas von `EinladungBauen`
 * wissen muss.
 *
 * PROPS:
 *   schritte        Die auf dieser Seite ERREICHBAREN Schritt-Zahlen, aufsteigend sortiert.
 *                    Zwei Beispiele aus dem Haus: `[1, 3]` (Versprechen, Kuss — kein
 *                    Auswahl-Schritt) oder `[1, 2, 3]` (Geburtstag — Schritt 2 ist die
 *                    Vorlagen-/Look-Wahl). Der erste Wert ist der Einstieg für UNBEKANNTE
 *                    Besucher; jeder Wert, der nicht in dieser Liste steht, wird aus der
 *                    Adresszeile ignoriert (kein `?s=`-Wert kann den Trichter auf einen
 *                    Schritt springen lassen, den es für dieses Produkt nicht gibt).
 *   schrittBekannt  Wohin ein BEKANNTER Besucher (`aktiveAdresse()` — Konto, Tor, Kasse)
 *                    beim allerersten Aufruf springt. Ueberspringt NUR Schritt 1 (Name +
 *                    E-Mail) — ein Auswahl-Schritt wie die Look-Wahl bleibt stehen, dafür
 *                    reicht Identität allein nicht (KONZEPT-TUNNEL.md: „Bekannte
 *                    überspringen Schritt 1 komplett").
 *   light, code     Reisen unveraendert in jede erzeugte Adresse mit — dieselben zwei
 *                    Parameter, die schon jede Anzeige des Hauses kennt.
 *   produkt         NUR fürs Messen (Owner-Architektur-Abgleich 12.08.2026, §32 „normierte
 *                    Funnel-Events") — die Produkt-Kennung (`kiss`/`wedding`/`versprechen`/…).
 *                    `TunnelSeite` selbst bleibt produktblind (siehe unten); dieser eine
 *                    String geht nur ins Analytics-Ereignis, nirgendwo sonst hinein.
 *   children        `(args: { schritt; onSchrittChange }) => ReactNode` — die Funnel-
 *                    Komponente des Aufrufers. `schritt` ist die aktuell gültige Zahl aus der
 *                    Adresszeile (oder aus der Bekannten-Weiche); `onSchrittChange` meldet
 *                    JEDE spätere Änderung zurück — vorwärts legt einen Verlaufseintrag an
 *                    (Handy-Zurück-Geste geht einen Schritt zurück statt die Seite zu
 *                    verlassen), rückwärts/gleichbleibend ersetzt nur.
 *
 * WARUM EIN CLIENT-BAUSTEIN MIT RENDER-PROP: Ein Server-Bauteil (die `page.tsx` jedes
 * Produkts) kann keine Funktion als Prop an ein Client-Bauteil reichen — Funktionen sind
 * nicht seriealisierbar über die Server/Client-Grenze. Jedes Produkt braucht deshalb einen
 * *dünnen* Client-Baustein (`"use client"`, wenige Zeilen), der `TunnelSeite` mit seiner
 * Funnel-Komponente verdrahtet — aber DORT steht nur noch Verdrahtung, keine Logik mehr.
 */
export default function TunnelSeite({ schritte, schrittBekannt, light, code, produkt = "", children }: {
  /** Die erreichbaren Schritte, aufsteigend — z. B. `[1, 3]` oder `[1, 2, 3]`. */
  schritte: number[];
  /** Sprung-Ziel für bekannte Besucher beim allerersten Aufruf. */
  schrittBekannt: number;
  light: boolean;
  code: string;
  /** Nur fürs Messen — siehe Kommentar oben (`funnel_started`/`step_completed`). */
  produkt?: string;
  children: (args: { schritt: number; onSchrittChange: (schritt: number) => void }) => ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sParam = searchParams.get("s");
  const erster = schritte[0];
  const gueltig = (n: number) => schritte.includes(n);

  const [schritt, setSchrittState] = useState<number | null>(() => {
    const n = Number(sParam);
    return sParam && gueltig(n) ? n : null;
  });

  const baueUrl = (s: number) => {
    const p = new URLSearchParams();
    p.set("s", String(s));
    if (light) p.set("light", "1");
    if (code) p.set("code", code);
    return `${pathname}?${p.toString()}`;
  };

  /**
   * ERSTER BESUCH OHNE `?s=` — BEKANNTE DIREKT AUF `schrittBekannt` (dieselbe Prüfung wie
   * überall im Haus, `aktiveAdresse()`: Konto-Sitzung, Tor/früherer Besuch, Kassen-Adresse —
   * eine einzige Zeile deckt alle drei ab). Läuft EINMALIG vor dem ersten Zeichnen des
   * Trichters, damit die Adresszeile von der allerersten Anzeige an stimmt.
   */
  useEffect(() => {
    if (schritt !== null) return;
    let bekannt = false;
    try { bekannt = !!aktiveAdresse(); } catch { /* privater Modus → als unbekannt behandeln */ }
    const s = bekannt ? schrittBekannt : erster;
    setSchrittState(s);
    router.replace(baueUrl(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Von aussen nachziehen (Browser-Zurück/-Vor, ein geteilter Link mit `?s=`). */
  useEffect(() => {
    const n = Number(sParam);
    if (sParam && gueltig(n)) setSchrittState(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sParam]);

  /**
   * `funnel_started` — EINMAL je Besuch, sobald der Trichter WIRKLICH steht (Owner-
   * Architektur-Abgleich 12.08.2026, §32). Nicht schon beim allerersten Rendern (`schritt`
   * ist dann noch `null`, siehe die Weiche oben), sonst zählte auch die Bekannte-Weiche
   * selbst als zweiter Besuch.
   */
  const gestartetGemeldet = useRef(false);
  useEffect(() => {
    if (schritt === null || gestartetGemeldet.current) return;
    gestartetGemeldet.current = true;
    void logTunnelEvent("funnel_started", produkt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schritt]);

  if (schritt === null) {
    return <div className="mt-8"><Laden art="flaeche" /></div>;
  }

  return (
    <>
      {children({
        schritt,
        onSchrittChange: s => {
          if (!gueltig(s)) return;
          if (String(s) === sParam) return;
          void logTunnelEvent("step_completed", produkt, { step: String(s) });
          const url = baueUrl(s);
          // VORWAERTS LEGT EINEN VERLAUFSEINTRAG AN — die Handy-Zurück-Geste geht damit
          // einen Schritt zurueck statt die Seite zu verlassen (Owner: „der user soll auch
          // vor und zurück in den steps"). Rueckwaerts/seitwaerts ERSETZT nur: ein Zurueck
          // im Trichter selbst (Chevron) legt keinen neuen Vorwaerts-Eintrag an, sonst liefe
          // die Geste ins Leere.
          if (s > (Number(sParam) || 0)) router.push(url);
          else router.replace(url);
        },
      })}
    </>
  );
}
