"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { LANGS, LANG_LABEL, LANG_COOKIE, isLang, type Lang } from "@/lib/lang";

/**
 * SPRACHUMSCHALTER — sitzt in der TopNav, also auf jeder Seite.
 * Die Wahl landet in einem Cookie (1 Jahr) und überstimmt die Browsersprache;
 * `router.refresh()` lässt die Server-Komponenten neu rendern, ohne Reload.
 *
 * Übersetzt sind bisher die Startseite/Themen und die Wetter-Ansicht. Auf noch
 * nicht übersetzten Seiten bleibt der Text englisch — die Wahl gilt trotzdem
 * weiter, sobald man auf eine übersetzte Seite kommt.
 */
export default function LangSwitch({ nur, rueckfall = "en" }: {
  /**
   * NUR DIESE SPRACHEN ANBIETEN (Owner 31.08.2026, mit Bild des Menüs auf der Firmenseite:
   * „du hast gesagt 3 sprachen").
   *
   * Er hat recht, und der Fehler war meiner: Die Seite gibt es in drei Sprachen, das Menü
   * bot weiter alle sieben an. Wer „Français" wählte, bekam einen HAKEN an einer Sprache,
   * die die Seite gar nicht spricht — der Umschalter behauptete etwas, das der Text nicht
   * einlöst. Ein Menüeintrag ist ein Versprechen; hier stehen nur noch die, die eingelöst
   * werden.
   *
   * Ohne Angabe bleibt es bei allen sieben — jede bestehende Seite ist unberührt.
   */
  nur?: Lang[];
  /** Was der Knopf zeigt, wenn die gespeicherte Wahl nicht in `nur` steht — dieselbe
      Rückfallsprache, die die Seite dann auch wirklich rendert. */
  rueckfall?: Lang;
} = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const boxRef = useRef<HTMLDivElement>(null);
  /**
   * ZU WELCHER SEITE DAS MENUE AUFKLAPPT (Owner 30.07.2026: „Sprachen ausserhalb").
   *
   * Es war fest nach links gebunden (`right-0`) — richtig, solange der Knopf ganz rechts sass.
   * Seit „Zurueck" und der Hell/Dunkel-Schalter danebenstehen, sitzt er links, und das Menue
   * klappte aus dem Bild. Statt einer festen Seite wird jetzt gemessen: Knopf in der linken
   * Bildschirmhaelfte → nach rechts aufklappen, sonst nach links.
   */
  const [nachRechts, setNachRechts] = useState(false);

  useEffect(() => {
    try {
      /**
       * DIE ADRESSE STICHT DAS COOKIE (31.08.2026, an der Firmenseite gesehen: Seite auf
       * Rumänisch, Knopf behauptet „Deutsch").
       *
       * Dieselbe Rangfolge wie beim Hell/Dunkel-Schalter: Steht die Sprache in der Adresse,
       * gewinnt die Adresse. Ein Link, den man gezielt an einen rumänischen Personalleiter
       * schickt (`/recruiting?lang=ro`), soll bei ihm auch dann rumänisch AUSSEHEN, wenn
       * hier vorher jemand Deutsch gewählt hat — und der Knopf darf darüber nicht lügen.
       *
       * Das Cookie wird dabei NICHT überschrieben: Ein verschickter Link ändert nicht die
       * dauerhafte Wahl des Empfängers, er gilt für diesen Aufruf.
       */
      const ausAdresse = new URLSearchParams(window.location.search).get("lang") ?? "";
      if (isLang(ausAdresse)) { setLang(ausAdresse); return; }

      const m = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`));
      const fromCookie = m ? decodeURIComponent(m[1]) : "";
      if (isLang(fromCookie)) { setLang(fromCookie); return; }
      /**
       * OHNE COOKIE ZEIGT ER, WAS DIE SEITE WIRKLICH SPRICHT (Owner 09.08.2026, mit Bild
       * einer deutschen Seite mit der Aufschrift „English": „ist das englisch, ja?").
       *
       * Hier stand „ohne Cookie bleibt es en" — das stimmte einmal, bis der Owner am
       * 30.07. entschied, dass ohne eigene Wahl die BROWSERSPRACHE gilt. Seitdem log der
       * Knopf: Der Server lieferte Deutsch, der Umschalter behauptete Englisch. Die
       * Wahrheit steht im `lang` der Seite — dieselbe Quelle, die der Server gesetzt hat.
       */
      const vonDerSeite = document.documentElement.lang?.slice(0, 2).toLowerCase() ?? "";
      if (isLang(vonDerSeite)) setLang(vonDerSeite);
    } catch { /**/ }
  }, []);

  // Klick daneben schließt das Menü.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const gezeigt: Lang = nur && !nur.includes(lang) ? rueckfall : lang;

  const pick = (l: Lang) => {
    setLang(l); setOpen(false);
    try { document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`; } catch { /**/ }
    /**
     * EINE EIGENE WAHL RÄUMT DIE ADRESSE FREI: Bliebe `?lang=ro` stehen, läse die Seite
     * weiter aus der Adresse — der Umschalter wäre sichtbar kaputt, weil sich nach dem
     * Antippen nichts ändert. Sein Klick ist die neuere Entscheidung, also fällt der
     * mitgeschickte Wunsch weg.
     */
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.has("lang")) {
        u.searchParams.delete("lang");
        /**
         * `router.replace` UND NICHT `history.replaceState` (31.08.2026 gemessen: Nach dem
         * Umschalten blieb die Seite rumänisch).
         *
         * `history.replaceState` ändert nur die Adresszeile. Next weiss davon nichts und
         * holte die Server-Komponente mit den ALTEN Suchparametern — also weiter mit
         * `lang=ro`. Der Umschalter sah damit kaputt aus: Knopf sagt Deutsch, Text bleibt
         * rumänisch. `router.replace` ersetzt den Eintrag UND rendert neu.
         */
        router.replace(u.pathname + (u.search || "") + u.hash);
        return;
      }
    } catch { /* die Wahl darf nie an der Adresszeile scheitern */ }
    router.refresh();
  };

  return (
    <div ref={boxRef} className="relative">
      <button type="button"
        onClick={() => {
          const r = boxRef.current?.getBoundingClientRect();
          if (r) setNachRechts(r.left < window.innerWidth / 2);
          setOpen(o => !o);
        }} aria-label="Language"
        className="flex h-9 items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 text-white/80 transition hover:text-white">
        <Globe className="h-4 w-4" />
        {/* AUSGESCHRIEBEN statt Kürzel (Owner 30.07.2026: „ich kann es gar nicht lesen. Es
            muss Sprache ausgeschrieben werden"). Die Namen liegen laengst in lib/lang.ts —
            „Română", „Deutsch", „English" versteht jeder, „RO" nicht. */}
        {/* Steht die gespeicherte Wahl nicht auf der Liste dieser Seite, zeigt der Knopf die
            Sprache, in der die Seite tatsächlich erscheint — nie eine, die sie nicht spricht. */}
        <span className="text-[12px] font-black">{LANG_LABEL[gezeigt] ?? String(gezeigt).toUpperCase()}</span>
      </button>
      {open && (
        <div className={`absolute top-11 z-50 w-40 max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-white/10 bg-[#141110] shadow-2xl ${nachRechts ? "left-0" : "right-0"}`}>
          {(nur ?? LANGS).map(l => (
            <button key={l} type="button" onClick={() => pick(l)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[13px] font-bold text-white/85 transition hover:bg-white/10">
              {LANG_LABEL[l]}
              {l === gezeigt && <Check className="h-4 w-4 text-[#f6cf51]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
