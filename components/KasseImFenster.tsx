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
