"use client";

import { useEffect, useState } from "react";

/**
 * WAS SIE HOCHGELADEN HABEN (Owner 14.09.2026: „ich will die Werke sehen, wenn da steht Werke
 * hochgeladen" · „ich will wissen, sind es Amateure oder nicht").
 *
 * ── EINE ZAHL SAGT NICHT, WER KOMMT ─────────────────────────────────────────────────────────
 *
 * Der Kasten darüber sagt, wie viele hochladen. Ob das Maler sind oder jemand, der ein Handyfoto
 * seiner Wand schickt, steht in keiner Kennzahl — das sieht man nur an den Bildern. Deshalb hier
 * die Werke selbst, neueste zuerst.
 *
 * ── DIE BILDER SIND NICHT ÖFFENTLICH ────────────────────────────────────────────────────────
 *
 * Jedes läuft über `api/versusforge-lauf-foto`, das denselben Schlüssel verlangt wie diese Seite
 * und nur aus dem einen Ordner ausliefert. Der Schlüssel steht damit in der Bildadresse — das ist
 * auf einer Seite, die ohne ihn ohnehin nicht zu sehen ist, kein zusätzliches Risiko, und es ist
 * derselbe Weg, den die Gesprächsliste unten schon benutzt.
 *
 * ── SIE LÄDT EINMAL ─────────────────────────────────────────────────────────────────────────
 *
 * Die Route liest je Gespräch das Protokoll; das gehört nicht in einen Takt. Wer frische Werke
 * sehen will, lädt die Seite neu.
 */

type Werk = { pfad: string; zeit: string; gespraech: string };

const zeitKurz = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

export default function EngineWerke({ schluessel }: { schluessel: string }) {
  const [werke, setWerke] = useState<Werk[] | null>(null);

  useEffect(() => {
    let lebt = true;
    void (async () => {
      try {
        const res = await fetch(`/api/engine-werke?s=${encodeURIComponent(schluessel)}`, { cache: "no-store" });
        const d = (await res.json()) as { ok?: boolean; werke?: Werk[] };
        if (lebt && d.ok) setWerke(d.werke ?? []);
      } catch { /* stiller Fehlversuch — eine Galerie darf die Seite nie aufhalten */ }
    })();
    return () => { lebt = false; };
  }, [schluessel]);

  /* Nichts da (noch am Laden oder wirklich keine Werke): kein leerer Kasten, der nach Fehler
     aussieht. Die Zahl im Kasten darüber sagt ohnehin, ob jemand hochgeladen hat. */
  if (!werke?.length) return null;

  const bildUrl = (pfad: string) =>
    `/api/versusforge-lauf-foto?p=${encodeURIComponent(pfad)}&s=${encodeURIComponent(schluessel)}`;

  return (
    <section className="mt-6 rounded-2xl border border-[#e4e9ee] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="m-0 text-[13px] font-black uppercase tracking-[0.16em] text-[#8b959d]">
          Was sie hochgeladen haben
        </p>
        <span className="text-[12.5px] text-[#8b959d]">die letzten {werke.length}</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {werke.map(w => (
          <a
            key={w.pfad}
            href={bildUrl(w.pfad)}
            target="_blank"
            rel="noreferrer"
            title={`${zeitKurz(w.zeit)} — zum Vergrössern klicken`}
            className="group relative block aspect-square overflow-hidden rounded-lg bg-[#eef1f4]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bildUrl(w.pfad)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition group-hover:scale-[1.03]"
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4 text-[10.5px] font-semibold text-white">
              {zeitKurz(w.zeit)}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
