"use client";

import { useEffect, useRef, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";

/**
 * DIE KASSE IN UNSERER SEITE (Owner 15.08.2026: „mir stinkt es mit stripe pop up fenster" ·
 * „wir müssen das in die seite einbauen").
 *
 * WAS VORHER WAR — und warum es weg musste:
 *   1. Ein leeres `window.open` als Popup-Blocker-Trick. In der Facebook-WebView stapelt das
 *      eine zweite Ebene ueber die Seite, aus der der Kunde oft nicht zurueckfindet.
 *      GEMESSEN: dort wurde 11-mal eine Kasse geoeffnet und NIE bezahlt.
 *   2. Danach (Schritt A desselben Tages) ein Seitenwechsel. Besser, aber der Kunde verlaesst
 *      die Seite immer noch — mit allem, was das an Zustand kostet.
 *
 * Jetzt rendert Stripe sein Formular in einem Dialog MITTEN IN der Seite. Kein Fenster, kein
 * Wechsel, kein Zurueckfinden.
 *
 * DIE RUECKKEHR BLEIBT, WIE SIE WAR: Nach der Zahlung schickt Stripe die oberste Seite auf
 * `return_url` mit `{CHECKOUT_SESSION_ID}` darin — genau die Adresse, die die Trichter seit
 * jeher als `cs` auswerten (`/api/checkout-status`). An diesem Weg musste nichts geaendert
 * werden, und er bleibt der Beweis, dass bezahlt wurde: nicht der Browser entscheidet das,
 * sondern der Server.
 *
 * OHNE SCHLUESSEL KEIN FORMULAR: Fehlt `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, rendert die
 * Komponente nichts und der Aufrufer faellt auf den Seitenwechsel zurueck. Ein fehlender
 * Schluessel darf keinen Kauf verhindern.
 *
 * DER AUFRUFER MUSS `key={clientSecret}` SETZEN (15.08.2026) — sonst zeigt der zweite
 * Kaufversuch die erste Kasse. Stripes Provider nimmt ein neues Geheimnis nicht an; die
 * Bibliothek verlangt woertlich „Unmount and create a new instance". Diese Komponente kann
 * das nicht selbst erzwingen, deshalb steht es hier: EINE Sitzung, EINE Einhaengung.
 */

const SCHLUESSEL = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "").trim();

/** Einmal laden, nicht je Dialog — sonst zieht jede Kasse das Stripe-Skript neu. */
let stripeP: Promise<Stripe | null> | null = null;
function stripeLaden(): Promise<Stripe | null> | null {
  if (!SCHLUESSEL) return null;
  if (!stripeP) stripeP = loadStripe(SCHLUESSEL);
  return stripeP;
}

/** Kann die eingebettete Kasse ueberhaupt laufen? Der Trichter fragt VOR dem Kauf. */
export function kasseImFensterMoeglich(): boolean {
  return !!SCHLUESSEL;
}

export default function KasseImFenster({ clientSecret, onSchliessen, titel }: {
  clientSecret: string;
  onSchliessen: () => void;
  titel?: string;
}) {
  const [stripe] = useState(stripeLaden);

  /**
   * KEIN VOLLBILD, KEINE GESPERRTE SEITE (Owner 15.08.2026: „es muss mit header bleiben die
   * seite" · „es darf sich nicht unterscheiden von den anderen" · „sonst bekommen die leute
   * eine schreck").
   *
   * Die Kasse ist ein Schritt wie jeder andere: derselbe Kopf darueber, dieselbe Spalte,
   * derselbe Hintergrund. Ein Kunde, der zum Bezahlen ploetzlich in einer fremden Ansicht
   * steht, bricht ab — und genau an dieser Stelle liegt sein Geld.
   *
   * Deshalb: normaler Block im Seitenfluss. Der Kopf (`sticky top-0`) bleibt stehen, weil
   * hier nichts mehr darueber liegt. Beim Erscheinen scrollt der Schritt sich selbst ins
   * Bild, damit niemand suchen muss.
   */
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    return () => clearTimeout(t);
  }, []);

  /**
   * DER AUSWEG AM SCHREIBTISCH (15.08.2026, Hausregel `immer-close-einbauen`).
   *
   * Am Handy schliesst der Zurueck-Pfeil des Schritts die Kasse — der Trichter raeumt
   * `kasseSecret` beim Schrittwechsel weg. Am Rechner erwartet man dafuer die Esc-Taste, und
   * sie kostet nichts: `onSchliessen` laesst den Auftrag unberuehrt, ein neues Tippen auf
   * Kaufen oeffnet eine frische Sitzung.
   *
   * Ein sichtbarer zweiter Knopf bleibt bewusst draussen (Owner 15.08.2026, mit Bild: „back
   * button wenn es drunter ist?") — zwei Zurueck-Wege untereinander sind ein Raetsel.
   */
  useEffect(() => {
    const taste = (e: KeyboardEvent) => { if (e.key === "Escape") onSchliessen(); };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [onSchliessen]);

  if (!stripe || !clientSecret) return null;

  /**
   * EIN SCHRITT WIE JEDER ANDERE (Owner 15.08.2026: „es müsste einfach einen schritt sein wie
   * ein seite" · „es muss mit header bleiben die seite" · „es darf sich nicht unterscheiden
   * von den anderen, sonst bekommen die leute eine schreck").
   *
   * Kein Vollbild, keine eigene Spalte, keine eigene Breite: Die Seite liefert Kopf und
   * Spalte, dieser Block setzt sich nur hinein. Am Desktop bleibt damit dieselbe schmale
   * Handy-Spalte stehen wie in den Schritten davor — der Kunde merkt keinen Wechsel.
   *
   * Zurueck-Pfeil statt Kreuz: Ein Kreuz heisst „abbrechen", hier wird aber nichts
   * abgebrochen — der Auftrag steht weiter, es geht nur einen Schritt zurueck.
   *
   * WIE ES DANACH WEITERGEHT: Nach der Zahlung schickt Stripe die Seite selbst auf
   * `return_url` mit `?cs=…`; der Trichter liest das beim Laden, stempelt den Auftrag und
   * laeuft in die Erzeugung. Diese Ansicht muss dafuer nichts tun und nichts wissen.
   */
  return (
    <div ref={ref} className="w-full pb-8 pt-2">
      <div>
        {/**
          * KEIN EIGENER ZURUECK-PFEIL (Owner 15.08.2026, mit Bild: „back button wenn es
          * drunter ist?").
          *
          * Er stand als ZWEITER Chevron unter dem Kaufknopf — der Trichter hat seinen eigenen
          * direkt darueber, und zwei Zurueck-Knoepfe untereinander sind keine Navigation,
          * sondern ein Raetsel. Solange die Kasse UNTER dem Schritt haengt statt ihn zu
          * ersetzen, gehoert hier keiner hin; zurueck geht es ueber den Pfeil des Schritts.
          */}
        <EmbeddedCheckoutProvider stripe={stripe} options={{ clientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}

/**
 * DER EINE KASSEN-WEG FÜR ALLE TRICHTER (Owner 15.08.2026: „die muss du alle umbauen" —
 * nachdem beim Tanz doch wieder Stripe aufging).
 *
 * WARUM ALS HAKEN UND NICHT FÜNFMAL ABGETIPPT: Jeder Trichter braucht exakt dieselben vier
 * Handgriffe — anfordern, das Geheimnis uebernehmen, beim Schrittwechsel wegraeumen, das
 * Formular rendern. Fuenf Kopien davon heisst: Der naechste Fehler wird fuenfmal repariert,
 * und beim vierten Mal vergisst es jemand. Das ist genau die Falle, gegen die das oberste
 * Gesetz vom 12.08. steht („allle funnels und wenn eine änderung dann ist es bei allen
 * gleich").
 *
 * SO WIRD ER BENUTZT:
 *   const kasse = useKasseImFenster(schritt);
 *   … body: JSON.stringify({ …, eingebettet: kasse.anfordern })
 *   … if (kasse.uebernehmen(start.clientSecret)) return false;   // Kasse steht in der Seite
 *   … {kasse.block}                                              // unten im JSX
 *
 * `schritt` ist der Ausweg (Hausregel `immer-close-einbauen`): Wer im Tunnel zurueckgeht,
 * raeumt die Kasse damit weg — ohne zweiten Zurueck-Knopf neben dem, den der Schritt schon
 * hat. Trichter ohne Schritte lassen das Argument einfach weg.
 */
export function useKasseImFenster(schritt?: number | string) {
  const [secret, setSecret] = useState("");
  useEffect(() => { setSecret(""); }, [schritt]);
  return {
    /** Mit in die Kassen-Anfrage: Ohne oeffentlichen Schluessel bleibt es beim Seitenwechsel. */
    anfordern: kasseImFensterMoeglich(),
    /**
     * Nimmt das `client_secret` der Kassensitzung entgegen. Rueckgabe `true` heisst: Das
     * Formular steht jetzt in der Seite, der Aufrufer ist fertig und darf NICHT mehr
     * zusaetzlich `kasseOeffnen` rufen. Ohne Geheimnis `false` — dann laeuft alles wie
     * bisher ueber die Adresse.
     */
    uebernehmen: (clientSecret?: string) => {
      if (!clientSecret) return false;
      setSecret(String(clientSecret));
      return true;
    },
    /**
     * Der Ausweg von aussen. Trichter, in denen `schritt` nicht im Bauteil selbst liegt
     * (Try-on: er kommt aus dem Render-Argument von `TunnelSeite`), raeumen die Kasse damit
     * ueber `<KasseZuBeiSchritt>` weg — ein Haken darf dort oben nicht stehen.
     */
    schliessen: () => setSecret(""),
    /** Das Formular selbst — `key` erzwingt je Sitzung eine frische Einhaengung (Pflicht!). */
    block: secret
      ? <KasseImFenster key={secret} clientSecret={secret} onSchliessen={() => setSecret("")} />
      : null,
  };
}

/**
 * DER WAECHTER FUER TRICHTER OHNE EIGENEN SCHRITT-ZUSTAND (15.08.2026).
 *
 * Im Try-on liegt `schritt` nicht im Bauteil, sondern im Render-Argument von `TunnelSeite`.
 * Dort einen Haken aufzurufen hiesse, ihn in der Render-Funktion eines FREMDEN Bauteils zu
 * setzen — das geht eine Weile gut und bricht an dem Tag, an dem der Aufruf einmal ausfaellt.
 * Dieser Winzling steht stattdessen im JSX, sieht den Schritt und meldet den Wechsel.
 */
export function KasseZuBeiSchritt({ schritt, aufZu }: { schritt: number; aufZu: () => void }) {
  useEffect(() => { aufZu(); }, [schritt]);   // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
