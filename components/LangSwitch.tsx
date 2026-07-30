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
export default function LangSwitch() {
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
      const m = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`));
      const fromCookie = m ? decodeURIComponent(m[1]) : "";
      if (isLang(fromCookie)) setLang(fromCookie);
      // Ohne Cookie bleibt es "en" — Englisch ist der Standard, nicht die Browsersprache.
    } catch { /**/ }
  }, []);

  // Klick daneben schließt das Menü.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = (l: Lang) => {
    setLang(l); setOpen(false);
    try { document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`; } catch { /**/ }
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
        <span className="text-[12px] font-black">{LANG_LABEL[lang] ?? String(lang).toUpperCase()}</span>
      </button>
      {open && (
        <div className={`absolute top-11 z-50 w-40 max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-white/10 bg-[#141110] shadow-2xl ${nachRechts ? "left-0" : "right-0"}`}>
          {LANGS.map(l => (
            <button key={l} type="button" onClick={() => pick(l)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[13px] font-bold text-white/85 transition hover:bg-white/10">
              {LANG_LABEL[l]}
              {l === lang && <Check className="h-4 w-4 text-[#f6cf51]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
