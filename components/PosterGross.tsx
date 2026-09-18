"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { Scheibe } from "@/components/CI";

/**
 * DAS POSTER GROSS (Owner 17.09.2026: „klick aufs bild vergrössert das poster full").
 *
 * ── WARUM EINE LAGE UND KEINE ZWEITE SEITE ──────────────────────────────────────────────────
 *
 * Hausregel: der Kunde bestellt dort, wo er das Poster sieht. Eine eigene Seite fürs Grosse
 * hiesse, ihn aus seiner Kachel zu nehmen und danach zurückzuschicken — und hiesse, dasselbe
 * Blatt zweimal zu bauen. Hier liegt das GLEICHE Blatt noch einmal gross über der Seite:
 * dieselben Kinder, nur in einem breiteren Kasten.
 *
 * Das geht, weil das Poster in `cqw` misst (Anteile SEINER Breite, siehe `Poster.tsx`): derselbe
 * Baustein ist in einer schmalen Kachel und über dem halben Bildschirm dasselbe Blatt, nur
 * grösser. Kein zweiter Entwurf, keine zweite Stelle zum Pflegen.
 *
 * Der Code im Blatt bleibt ein eigener Link (er führt ins QR-Fenster) — deshalb öffnet diese
 * Lage nur, wenn der Klick NICHT auf einem Link gelandet ist.
 */
/** Öffnet das Grosse — gesetzt von `PosterGross`, benutzt vom Knopf in der Bildecke. */
const GrossContext = createContext<(() => void) | null>(null);

/**
 * ── OB DER KUNDE SCHON SEIN EIGENES BILD DRIN HAT (Owner 17.09.2026: „das hätte er gar nicht
 * gerne, dass jemand seinen Namen hier einträgt und druckt" · „ja schreib seinen namen sonst
 * dreht er durch") ──────────────────────────────────────────────────────────────────────────
 *
 * Solange das ORIGINAL des Künstlers im Blatt steht, trägt es SEINEN Namen — „Numele tău" über
 * seinem Werk wäre eine Einladung, sein Bild mit fremdem Namen zu drucken. Erst wenn der Kunde
 * sein eigenes Foto hineingelegt hat, gehört die Zeile ihm. `PosterDeinBild` setzt den
 * Zustand, Titel und Stilzeile lesen ihn.
 */
export const EigenesContext = createContext<{
  eigenes: boolean; setEigenes: (v: boolean) => void;
  /** Ob der Kunde den Titel überschrieben hat — dann erst steht „BY …" darunter. */
  titelEigen: boolean; setTitelEigen: (v: boolean) => void;
}>({ eigenes: false, setEigenes: () => {}, titelEigen: false, setTitelEigen: () => {} });

/**
 * ── DER KNOPF IN DER ECKE (Owner 17.09.2026: „jetzt vergrössern icon in der ecke") ───────────
 *
 * Seit der Klick aufs Blatt nichts mehr öffnet (zu viele Fehlgriffe neben Knopf und Regler),
 * braucht das Grosse einen eigenen Auslöser: unten rechts AUF dem Werk, als weisse `Scheibe`
 * wie das Löschkreuz oben rechts, mit dem Symbol, das auch das Film-Fenster fürs Vergrössern
 * benutzt. Sitzt im Bildfeld (`bildEcke` in Poster.tsx), misst in `cqw`, und ist im Grossen
 * selbst ausgeblendet (globals.css, `lb-poster-nur-blatt`).
 */
export function PosterGrossKnopf() {
  const oeffnen = useContext(GrossContext);
  if (!oeffnen) return null;
  return (
    <span className="lb-poster-gross-knopf absolute" style={{ right: "2cqw", bottom: "2cqw" }}>
      <Scheibe label="Vergrössern" groesse="6cqw"
        onClick={e => { e?.preventDefault(); e?.stopPropagation(); oeffnen(); }}>
        <Maximize2 style={{ width: "50%", height: "50%" }} aria-hidden />
      </Scheibe>
    </span>
  );
}

export default function PosterGross({ children, zu, alsPoster = true, href }: {
  children: React.ReactNode;
  zu?: string;
  /** Ohne Posterlayout bleibt die Kachel ein gewöhnlicher Link (zur Werkseite). */
  alsPoster?: boolean;
  href?: string;
}) {
  const [auf, setAuf] = useState(false);
  const [eigenes, setEigenes] = useState(false);
  const [titelEigen, setTitelEigen] = useState(false);

  /**
   * ── HAKEN VOR JEDEM AUSSTIEG (17.09.2026: „warum stürzt ab") ────────────────────────────
   *
   * Dieser `useEffect` stand UNTER dem `return` für `alsPoster = false` — also lief er nur in
   * einem der beiden Fälle. React zählt die Haken je Aufbau: Wechselt dieselbe Stelle von der
   * Posteransicht in die Originalansicht (die neuen Reiter tun genau das), stimmt die Zahl nicht
   * mehr und die Seite bricht ab („Rendered fewer hooks than expected"). Haken stehen deshalb
   * immer vor jedem bedingten Ausstieg.
   *
   * Solange das Blatt gross liegt, scrollt die Seite darunter nicht mit, und Esc schliesst.
   */
  useEffect(() => {
    if (!auf) return;
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const taste = (e: KeyboardEvent) => { if (e.key === "Escape") setAuf(false); };
    document.addEventListener("keydown", taste);
    return () => { document.removeEventListener("keydown", taste); document.body.style.overflow = vorher; };
  }, [auf]);

  if (!alsPoster) return <a href={href} className="block text-[#111] no-underline">{children}</a>;

  /* ── KEIN KLICK AUFS BLATT MEHR (Owner 17.09.2026: „mach den klick aufs bild raus, weil ich aus
     versehen immer das vollbild öffne") ──────────────────────────────────────────────────────
     Seit Knopf, Stift, Regler und Löschkreuz AUF dem Blatt liegen, ist jeder Fehlgriff daneben
     ein Vollbild. Das Grosse bleibt als Bauteil erhalten (`auf`), öffnet aber nicht mehr von
     selbst — bis der Owner einen eigenen Auslöser dafür will. */
  return (
    <EigenesContext.Provider value={{ eigenes, setEigenes, titelEigen, setTitelEigen }}>
    <GrossContext.Provider value={() => setAuf(true)}>
      <div>{children}</div>

      {auf ? (
        <div
          role="dialog" aria-modal="true"
          onClick={e => { if (e.target === e.currentTarget) setAuf(false); }}
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/95 p-4"
        >
          {/* Das Blatt so gross wie die Höhe es zulässt: Breite = Höhe / A-Verhältnis, damit es
              ganz zu sehen ist statt am unteren Rand abgeschnitten. */}
          {/* ── GROSS HEISST: NUR DAS BLATT (Owner 17.09.2026: „beim vergrössern blendest du die
              buttons raus") ─────────────────────────────────────────────────────────────────────
              Die zwei Knöpfe sind Werkzeug, kein Druck. Wer das Poster gross ansieht, will sehen,
              was an der Wand hängt — und da hängt kein Knopf. `lb-poster-nur-blatt` nimmt sie in
              dieser Lage weg (globals.css); der Code bleibt, den druckt das Blatt ja auch. */}
          <div className="lb-poster-nur-blatt w-[min(92vw,calc(88svh/1.4142))]">{children}</div>

          <button type="button" onClick={() => setAuf(false)} aria-label={zu ?? "Schliessen"}
            className="absolute right-4 top-4 grid h-16 w-16 place-items-center rounded-full bg-white text-[#111] shadow-[0_4px_18px_rgba(0,0,0,.45)]">
            <X className="h-7 w-7" aria-hidden />
          </button>
        </div>
      ) : null}
    </GrossContext.Provider>
    </EigenesContext.Provider>
  );
}
