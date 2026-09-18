"use client";

import { useContext, useRef, useState } from "react";
import { EigenesContext } from "@/components/PosterGross";
import { posterStilStil } from "@/components/Poster";
import { Pencil } from "lucide-react";
import {
  POSTER, POSTER_TEXT_ZEICHEN, POSTER_TITEL_ZEICHEN, posterTextBreit, posterTitelBreit,
} from "@/lib/lakatosbandi-poster";

/**
 * WAS DER KUNDE AUF DEM BLATT SELBST SCHREIBT — TITEL UND SATZ (Owner 17.09.2026: „ok jetzt text
 * editieren" · „edit icon für titel").
 *
 * ── KEIN ZUSTAND, KEINE KNÖPFE (Owner 17.09.2026: „kein löschen oder ok button hier" · „er kann
 * das doch jederzeit überschreiben") ────────────────────────────────────────────────────────
 *
 * Erst stand hier ein Bearbeiten-Modus mit Haken und Kreuz. Das ist eine Verwaltung für etwas,
 * das keine braucht: Die Zeile gehört ihm, solange er auf der Seite ist, und er kann sie jederzeit
 * überschreiben — nichts zu bestätigen, nichts zu verwerfen. Also ist sie einfach ein Feld:
 * hineintippen, fertig. Der Stift daneben sagt nur, DASS man das darf.
 *
 * ── AUF DEM BLATT, NICHT IN EINEM FORMULAR (Hausregel WYSIWYG) ──────────────────────────────
 *
 * Dieselbe Stelle, dieselbe Schrift, dasselbe Blatt — kein Rahmen, keine Linie (Owner: „die
 * blöde linie raus"). Er sieht beim Tippen, was gedruckt wird.
 *
 * ── DIE FLÄCHE IST FEST, DIE SCHRIFT FOLGT (Owner 17.09.2026: „text block ist begrenzt. egal
 * was der user schreibt dann wird der text kleiner") ────────────────────────────────────────
 *
 * Die Rechnung steht bei den Maßen (`posterTextBreit` · `posterTitelBreit`), weil das Blatt und
 * die Druckdatei dieselbe brauchen. Und sie hört an einem Boden auf, unter dem niemand mehr
 * liest (Owner: „das ist zu klein, kann keiner lesen") — dafür endet die Zeile bei so vielen
 * Zeichen, wie bei dieser Mindestgrösse hineinpassen.
 *
 * Gespeichert wird nichts: wie das Foto lebt der Text nur im Browser (Owner: „wenn er rausgeht
 * von der seite, dann ist das bild weg").
 */
export default function PosterDeinText({ satz, art = "satz", qrEcke = false }: {
  /** Was der Künstler geschrieben hat — steht hier, bis der Kunde darüber schreibt. */
  satz: string;
  /** „satz" = der Anriss (zwei Zeilen) · „titel" = die grosse Überschrift (eine Zeile). */
  art?: "satz" | "titel";
  qrEcke?: boolean;
}) {
  const { setTitelEigen } = useContext(EigenesContext);
  const [text, setText] = useState(satz);
  const feld = useRef<HTMLTextAreaElement>(null);

  const istTitel = art === "titel";
  const breit = istTitel ? posterTitelBreit(text) : posterTextBreit(text, qrEcke);

  return (
    <>
      {/* Das Feld SIEHT aus wie die Zeile — keine Kästen, keine Ränder. Erst wer hineintippt,
          merkt den Unterschied, und genau das ist die Absicht. */}
      <textarea ref={feld} value={text} rows={istTitel ? 1 : 2}
        /* Die Zeile endet dort, wo die Schrift sonst unter den Lesbarkeits-Boden fiele. */
        maxLength={istTitel ? POSTER_TITEL_ZEICHEN : POSTER_TEXT_ZEICHEN}
        onChange={e => {
          const v = e.target.value.replace(/\n/g, istTitel ? "" : "\n");
          setText(v);
          /* Steht noch sein Name da, gehört das Blatt ihm — dann keine zweite Namenszeile. */
          if (istTitel) setTitelEigen(!!v.trim() && v.trim() !== satz.trim());
        }}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => { e.stopPropagation(); if (istTitel && e.key === "Enter") e.preventDefault(); }}
        className={`lb-poster-feld block w-full resize-none bg-transparent text-center outline-none ${istTitel ? "italic" : ""}`}
        style={{
          fontSize: `${breit.toFixed(2)}cqw`,
          lineHeight: istTitel ? 1.1 : POSTER.text.zeile,
          color: POSTER.farben.tinte,
        }}
      />

      {/* Rechts neben der Zeile, auf halber Höhe (Owner 17.09.2026: „edit button rechts vom
          text" · „auch edit icon zentriert") — ein Hinweis, kein Schalter: er setzt nur den
          Cursor hinein. Beim TITEL der grosse Stift (Owner 17.09.2026: „andersrum, titel icon
          grösser") — er gehört zur grossen Zeile; beim Satz der kleinere. */}
      <span className="absolute flex items-center"
        style={{ right: 0, top: "50%", transform: "translateY(-50%)" }}>
        <button type="button" aria-label="Edit"
          onClick={e => { e.preventDefault(); e.stopPropagation(); feld.current?.focus(); feld.current?.select(); }}
          className="lb-poster-stift"
          style={{
            width: `${istTitel ? POSTER.qr.breit : POSTER.qr.breit * 0.62}cqw`,
            height: `${istTitel ? POSTER.qr.breit : POSTER.qr.breit * 0.62}cqw`,
          }}>
          <Pencil style={{ width: "52%", height: "52%" }} aria-hidden />
        </button>
      </span>
    </>
  );
}

/**
 * „BY ADRIAN ROȘU" — ERST, WENN DER TITEL NICHT MEHR SEIN NAME IST (Owner 17.09.2026: „mach
 * bei allen Künstlern den Künstlernamen rein statt Numele tău").
 *
 * Auf dem Blatt steht von Anfang an der Name des Künstlers, nicht ein Platzhalter — auch über
 * dem erzeugten Bild. Erst wenn der Kunde die Zeile überschreibt (sein Name, ein Titel), tritt
 * hier „BY …" darunter: dann sagt das Blatt beides. Solange oben sein Name steht, stünde er
 * sonst zweimal da.
 */
export function PosterStil({ name }: { name: string }) {
  const { titelEigen } = useContext(EigenesContext);
  if (!titelEigen) return null;
  return <p className="m-0 font-serif" style={posterStilStil}>{`by ${name}`}</p>;
}

/**
 * ── WER DEN STIL GEMACHT HAT, UND WO ER ZU FINDEN IST (Owner 18.09.2026) ────────────────────
 *
 * „Die Leute, wenn sie auf Instagram ihre Kunst posten, kann ihre Kunst von anderen für KI
 * benutzt werden. Bei uns auch — aber wir machen folgendes: Wir benutzen das als Werbung für den
 * Künstler. Auf jedem erzeugten Bild in ihrem Stil kommt der Name rein … und ihre Adresse."
 *
 * Deshalb steht in der Fusszeile immer die Adresse SEINER Seite (nicht nur das Haus), und sobald
 * das Bild vom Kunden kommt, davor der Nachweis „nach dem Stil von …". Ein erzeugtes Blatt an
 * einer fremden Wand wird damit zu einem Schild, das auf ihn zeigt.
 */
export function PosterRecht({ name, adresse, stilText }: {
  name: string;
  /** „lakatosbandi.com/gerrylouisett-2" — ohne Schema, das liest sich auf Papier besser. */
  adresse: string;
  /** „după stilul lui {name}" — der Platzhalter wird hier gefüllt. */
  stilText: string;
}) {
  const { eigenes } = useContext(EigenesContext);
  return <>{eigenes ? `${stilText.replace("{name}", name)} · ${adresse}` : adresse}</>;
}
