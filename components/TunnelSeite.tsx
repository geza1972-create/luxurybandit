"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Laden, ThemenKreise } from "@/components/CI";
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
export default function TunnelSeite({ schritte, schrittBekannt, light, code, produkt = "", inhalt, children }: {
  /**
   * DER INHALT DER LANDINGPAGE, UNTER DEM ANMELDEFORMULAR (Owner 14.08.2026: „ich glaube dass
   * alles was wir auf der Landingpage haben auch im Tunel zeigen müssen aber unter dem
   * Anmeldeformular" — „das gilt generell für den Tunel").
   *
   * DER STECKPLATZ GEHOERT HIERHER, nicht in jede Produktseite: Anzeigen-Traffic landet direkt
   * im Tunnel und sieht die Landingpage nie — ihm fehlten damit Produktkasten, Garantie und
   * alle erklaerenden Abschnitte. Weil ALLE Trichter dieses Geruest benutzen (Memory
   * `ein-tunnel-geruest-fuer-alle`), erbt jedes Produkt den Platz und muss ihn nur noch
   * fuellen; ohne `inhalt` bleibt der Tunnel exakt wie bisher.
   *
   * Der Aufrufer reicht hier DIESELBE Komponente herein, die auch seine Landingpage rendert —
   * nie eine zweite Fassung des Textes, sonst laufen die beiden auseinander.
   */
  inhalt?: ReactNode;
  /** Die erreichbaren Schritte, aufsteigend — z. B. `[1, 3]` oder `[1, 2, 3]`. */
  schritte: number[];
  /** Sprung-Ziel für bekannte Besucher beim allerersten Aufruf. */
  schrittBekannt: number;
  light: boolean;
  code: string;
  /** Nur fürs Messen — siehe Kommentar oben (`funnel_started`/`step_completed`). */
  produkt?: string;
  /**
   * `onVorlage` MELDET DIE GEWAEHLTE VORLAGE IN DIE ADRESSZEILE (Owner 16.08.2026: „ziel ist
   * es zu sehen ebenso welchen template sie auswählen, also auch das muss eine eigene url
   * haben").
   *
   * Warum ueber die Adresse und nicht nur als Ereignis: Ein Ereignis sieht nur, wer die
   * Auswertung liest — die Adresse sieht JEDER, der dem Besucher zuschaut, sie laesst sich
   * teilen, in eine Anzeige legen und aus dem Verlauf zurueckholen. Und weil jedes
   * Trichter-Ereignis die Adresszeile mitliest (lib/track-funnel.ts), steht die Vorlage damit
   * automatisch an ALLEN folgenden Stufen, nicht nur an der Wahl selbst.
   */
  children: (args: { schritt: number; onSchrittChange: (schritt: number) => void; onVorlage: (vorlage: string) => void; urlVorlage: string }) => ReactNode;
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

  /**
   * DIE HERKUNFT REIST MIT (16.08.2026, beim Nachmessen der Kuss-Anzeige gefunden).
   *
   * GEMESSEN, NICHT VERMUTET: Die Anzeige zeigt auf `…/start?s=3&light=1&src=fb`. Sobald der
   * Besucher EINEN Schritt weiterging, stand in der Adresszeile `?s=2&light=1` — `src` war
   * weg. Und `logFunnelEvent` liest die Quelle bei JEDEM Ereignis frisch aus
   * `window.location.search` (lib/track-funnel.ts). Folge: Der erste Aufruf zählte als
   * „fb", jede spätere Stufe — Adresse, Kauf, Lieferung — als Quelle „unbekannt". Die
   * Anzeige sah damit aus, als brächte sie nur Aufrufe und keine Käufe, was in der
   * Auswertung schlimmer ist als gar keine Zahl: Man dreht ein Budget ab, das trägt.
   *
   * Deshalb wandern hier ALLE bekannten Herkunfts-Parameter unverändert in jede erzeugte
   * Adresse — dieselbe Reihenfolge, die `logFunnelEvent` liest, plus `utm_campaign`/
   * `utm_medium` für die Auswertung ausserhalb des Hauses.
   */
  /* `video` ist keine Herkunft, sondern der Video-Einstieg des Lebenslauf-Tunnels
     (?video=<kennung> — LebenslaufStartClient): er muss jede Adress-Neuschreibung
     (Schritt-Sync hier, AdminUrlMirror) ueberleben, sonst verliert ein Remount den
     Einstieg. Andere Tunnel setzen ihn nie — dort traegt die Liste ihn einfach nicht. */
  const HERKUNFT = ["utm_source", "source", "src", "ref", "utm_campaign", "utm_medium", "fbclid", "video"];

  const baueUrl = (s: number, vorlage?: string) => {
    const p = new URLSearchParams();
    p.set("s", String(s));
    if (light) p.set("light", "1");
    if (code) p.set("code", code);
    /* Die Vorlage bleibt an der Adresse haengen, sobald sie einmal gewaehlt wurde — auch
       ueber die naechsten Schritte hinweg (`v` aus der aktuellen Adresse, wenn der Aufrufer
       keine neue nennt). */
    const v = vorlage ?? searchParams.get("v") ?? "";
    if (v) p.set("v", v);
    for (const k of HERKUNFT) {
      const v = searchParams.get(k);
      if (v) p.set(k, v);
    }
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
      {/* DIE THEMEN-LEISTE IST IN DEN KOPF UMGEZOGEN (15.08.2026, Owner: „Slider ueberall
          einbauen") — sie stand hier, seit sie als Querverkauf begann, und waere jetzt
          doppelt. Siehe components/TopNav.tsx. */}

      {children({
        schritt,
        /**
         * DIE GEWAEHLTE VORLAGE AUS DER ADRESSE (Owner 18.08.2026: „ich habe beim ersten mal
         * bandit kiss ausgesucht dann bin ich zurück um ein anderes zu wählen" — geliefert
         * wurde trotzdem das erste).
         *
         * Die Wahl lag nur im Arbeitsspeicher des Trichters. Ein Schrittwechsel baut ihn neu
         * auf, der Zustand faellt auf leer zurueck, und leer heisst „nimm die erste Vorlage".
         * Deshalb reicht die Adresse sie jetzt herunter: Sie ueberlebt Zurueck, Vorwaerts,
         * Neuladen und einen geteilten Link — genau dafuer steht sie seit dem 16.08. dort.
         */
        urlVorlage: searchParams.get("v") ?? "",
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
        /**
         * DIE VORLAGE IN DIE ADRESSE — OHNE VERLAUFSEINTRAG (`replace`).
         *
         * Bewusst kein `push`: Wer sich durch vier Kacheln tippt, soll mit der Zurück-Geste
         * einen SCHRITT zurueckgehen und nicht viermal durch seine eigenen Antipper. Die
         * Adresse zeigt trotzdem immer die zuletzt gewaehlte Vorlage.
         */
        onVorlage: v => {
          const sauber = String(v ?? "").trim().slice(0, 60);
          if (!sauber || sauber === searchParams.get("v")) return;
          router.replace(baueUrl(Number(sParam) || schritt || erster, sauber));
        },
      })}


      {/* Erst der Trichter, dann die Erklaerung — wer schon ueberzeugt ist, faengt oben an;
          wer noch zweifelt, findet darunter alles, was auch die Landingpage zeigt. */}
      {inhalt}
    </>
  );
}
