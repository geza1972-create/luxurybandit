"use client";

import { useEffect, useState } from "react";
import TeilenKnopf from "@/components/TeilenKnopf";

/**
 * DER TEILEN-KNOPF AUF DER EINLADUNGSKARTE (Owner 10.08.2026: „Ich kann den Planner gar nicht
 * sharen sehe ich. Es wird irgendtwas kopiert, was keiner braucht." · „ich habe hier schon
 * zwei teilen. Du muss es auf die Karte machen.").
 *
 * ZWEI FEHLER AUF EINMAL, die er gefunden hat:
 *
 * 1. Auf der fertigen Einladung gab es gar keinen Teilen-Knopf. Wer seinen Planer gebaut
 *    hatte, stand vor einer Seite, deren Adresse er aus der Adresszeile klauben musste —
 *    ausgerechnet bei einem Produkt, dessen ganzer Zweck das Verschicken ist.
 * 2. Der Knopf, den es gab, lag im Trichter und teilte `/themes/wedding` — unsere
 *    VERKAUFSSEITE. Genau das war „irgendwas, was keiner braucht": Er will seine Einladung
 *    an die Gäste schicken, kopiert wurde unsere Werbung.
 *
 * WARUM ER NUR DEM BRAUTPAAR ERSCHEINT: Diese Seite sehen auch die GÄSTE. Ein Gast soll die
 * Einladung eines Freundes nicht weiterverteilen — die Regel stand schon am 31.07.2026 als
 * Kommentar auf der Beispielseite, es fehlte nur die Umsetzung an dieser Stelle. Geprüft wird
 * mit derselben Frage wie beim Bearbeiten-Knopf (`pruefen` in `/api/einladung`, Gerätekennung);
 * ein zweiter, eigener Weg wäre ein zweites Schlupfloch.
 *
 * Solange die Antwort nicht da ist, zeigt der Knopf nichts — lieber kein Knopf als einer, der
 * eine Sekunde später verschwindet.
 */
export default function EinladungTeilen({ id, text, label }: {
  id: string;
  /** Was neben dem Link steht — die Namen des Paares. */
  text: string;
  label: string;
}) {
  const [darf, setDarf] = useState(false);

  useEffect(() => {
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    const pin = (() => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } })();
    if (!device && !pin) return;
    void fetch("/api/einladung", {
      method: "POST", headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
      body: JSON.stringify({ pruefen: id, device }),
    }).then(r => r.json()).then(d => setDarf(!!d?.darf)).catch(() => {});
  }, [id]);

  if (!darf) return null;
  return <TeilenKnopf rund url={`/einladung/${id}`} text={text} label={label} kopiertLabel={label} />;
}
