"use client";

import { useContext, useEffect, useRef } from "react";
import { EigenesContext } from "@/components/PosterGross";
import { posterStilStil } from "@/components/Poster";
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
/** „titel" heisst die grosse Zeile — dieselbe Unterscheidung wie unten, nur früher gebraucht. */
const istTitelVon = (art: "satz" | "titel") => art === "titel";

export default function PosterDeinText({ satz, art = "satz", qrEcke = false }: {
  /** Was der Künstler geschrieben hat — steht hier, bis der Kunde darüber schreibt. */
  satz: string;
  /** „satz" = der Anriss (zwei Zeilen) · „titel" = die grosse Überschrift (eine Zeile). */
  art?: "satz" | "titel";
  qrEcke?: boolean;
}) {
  /**
   * ── GESCHRIEBEN WIRD AUF DEM BLATT (Owner 19.09.2026: „ich will die Texte hier ändern,
   * WYSIWYG") ─────────────────────────────────────────────────────────────────────────────────
   *
   * DREIMAL HAT DIESE ZEILE DIE SEITE GEWECHSELT, und jedes Mal aus einem echten Grund:
   *  1. Erst auf dem Blatt — aber ohne Speichern. Er tippte seinen Namen, zahlte zehn Euro, und
   *     in der Datei stand „Numele tău".
   *  2. Dann nur im Fenster. Das speicherte, war aber kein Blatt mehr: Er sieht beim Schreiben
   *     nicht, wie es gesetzt wird — welche Grösse, welcher Umbruch, ob es passt.
   *  3. JETZT BEIDES: Hier wird geschrieben, wie auf Papier, und `PosterDeinBild` schickt das
   *     Geschriebene an den Zettel, sobald das Blatt bezahlt ist. Das Fenster bleibt für Foto
   *     und Adresse — für das, was kein Text auf dem Blatt ist.
   *
   * DIE SCHRIFT SCHRUMPFT BEIM TIPPEN MIT (`posterTitelBreit`), der Umbruch stimmt, die Farbe
   * stimmt. Was er sieht, wird gedruckt.
   */
  const { setTitelEigen, eigenes, zeilen, setZeile } = useContext(EigenesContext);
  const text = (istTitelVon(art) ? zeilen.titel : zeilen.satz) || satz;

  /**
   * DIE WORTE DES KÜNSTLERS SIND DER ANFANGSWERT — im Fenster steht dann, was gerade auf dem
   * Blatt steht, und er ändert es, statt vor einem leeren Feld zu sitzen. Gleichzeitig ist es
   * die Voraussetzung für den roten Rahmen: Nur wenn dort etwas steht, lässt sich sagen, ob er
   * es angefasst hat.
   */
  useEffect(() => {
    const was = istTitelVon(art) ? "titel" : "satz";
    if (!(was === "titel" ? zeilen.titel : zeilen.satz)) setZeile(was, satz);
  }, [art, satz, zeilen.titel, zeilen.satz, setZeile]);

  const istTitel = art === "titel";
  const breit = istTitel ? posterTitelBreit(text) : posterTextBreit(text, qrEcke);

  /* „by …" tritt hervor, sobald er den Titel überschrieben hat. */
  useEffect(() => {
    if (istTitel) setTitelEigen(!!text.trim() && text.trim() !== satz.trim());
  }, [istTitel, text, satz, setTitelEigen]);

  /**
   * ── WAS ER NOCH NICHT ANGEFASST HAT, WIRD ROT (Owner 19.09.2026: „er muss sehen, dass der Text
   * nicht geändert ist. Entweder werden die Rahmen rot beim Text") ────────────────────────────
   *
   * DAS PROBLEM: Er lässt sein Bild zeichnen, freut sich, lädt die Datei — und erst an der Wand
   * fällt ihm auf, dass oben noch der Name des Künstlers steht und darunter dessen Satz. „Er
   * generiert das Bild zuerst, dann vergisst er seinen Namen einzutragen und ist verärgert."
   *
   * ── UND ZWAR VOR DER KASSE (Owner 19.09.2026: „das Problem ist hier. Es wird nur Bild gekauft
   * und Text ist nicht geändert, aber alles schon bezahlt und versendet") ────────────────────
   *
   * Zuerst stand die Markierung hinter der Erzeugung. Das ist zu spät: Bezahlt und verschickt
   * wird VORHER, und dann steht „Numele tău" auf einem Blatt, für das er zehn Euro gegeben hat.
   * Sie erscheint deshalb, sobald sein Foto im Blatt liegt — also genau in dem Moment, in dem
   * das Blatt seins wird und der Kaufknopf angeht.
   *
   * SOLANGE KEIN FOTO DRIN IST, bleibt alles ruhig: Dann ist es das Blatt des Künstlers, und
   * dort sind seine Worte richtig — ein roter Rahmen wäre eine Rüge für nichts.
   *
   * ER WIRD NICHT GEHINDERT. Die Markierung sagt „schau noch mal hin", sie sperrt nichts: Wer
   * den Satz des Künstlers stehen lassen will, darf das (Hausregel: sichtbar machen, nicht
   * verriegeln). Sobald er tippt, ist sie weg.
   *
   * GESTRICHELT, NICHT AUSGEFÜLLT: Ein Feld auf einem Poster darf nicht wie ein Formular
   * aussehen. Der gestrichelte Rand ist dieselbe Sprache, die das Dashboard für „hier kannst du
   * schreiben" benutzt — nur in Rot.
   */
  const offen = eigenes && text.trim() === satz.trim();

  /**
   * ── DER TEXT IM FELD WIRD NUR VON AUSSEN GESETZT, WENN NIEMAND DARIN SCHREIBT ───────────────
   *
   * Ein `contentEditable`, dessen Inhalt React bei jedem Tastendruck neu setzt, wirft den Cursor
   * an den Anfang zurück — nach dem zweiten Buchstaben tippt man rückwärts. Deshalb schreibt der
   * Haken den Text NUR, wenn das Feld nicht den Fokus hat: beim ersten Aufbau, beim Foto-Wechsel,
   * nach dem Laden. Was drinsteht, während er tippt, gehört dem Browser.
   */
  /* Beschreibbar, sobald sein Foto im Blatt liegt — davor ist es das Blatt des Künstlers, und
     dessen Zeilen gehören ihm. Genau derselbe Moment, in dem die rote Markierung erscheint. */
  const bearbeitbar = !!eigenes;

  const feld = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = feld.current;
    if (!el || document.activeElement === el) return;
    if (el.textContent !== text) el.textContent = text;
  }, [text, bearbeitbar]);

  return (
    <>
      {/* Dieselbe Stelle, dieselbe Schrift, dasselbe Papier — kein Rahmen, keine Linie.

          EIN `span`, KEIN `p`: Das Blatt setzt die Zeile schon in einen Absatz, und ein Absatz
          im Absatz ist ungültiges HTML — der Browser zieht ihn heraus, und React bricht beim
          Hydrieren ab (19.09.2026 gemessen: „Hydration failed"). */}
      <span ref={feld}
        contentEditable={bearbeitbar}
        suppressContentEditableWarning
        role={bearbeitbar ? "textbox" : undefined}
        tabIndex={bearbeitbar ? 0 : undefined}
        spellCheck={false}
        /* Der Klick gehört dem Feld, nicht dem Blatt darunter. */
        onClick={e => { if (bearbeitbar) e.stopPropagation(); }}
        onInput={e => setZeile(istTitel ? "titel" : "satz", e.currentTarget.textContent ?? "")}
        /* Auf einem Poster gibt es keine Absätze — Enter beendet das Schreiben, statt eine
           zweite Zeile in die Überschrift zu setzen. */
        onKeyDown={e => { if (istTitel && e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
        /* Eingefügtes kommt als reiner Text herein: fremde Schrift und fremde Farbe hätten auf
           dem Blatt nichts zu suchen. */
        onPaste={e => {
          if (!bearbeitbar) return;
          e.preventDefault();
          const roh = e.clipboardData.getData("text/plain").replace(/\s+/g, " ").trim();
          document.execCommand("insertText", false, roh);
        }}
        className={`lb-poster-feld m-0 block w-full whitespace-pre-line text-center outline-none ${istTitel ? "italic" : ""}${offen ? " lb-poster-feld-offen" : ""}${bearbeitbar ? " lb-poster-feld-kann" : ""}`}
        style={{
          /* Der Titel folgt `--lb-f-titel` (stehendes Werk, siehe `POSTER_HOCHKANT`); der Satz
             IST der Massstab des Blocks und braucht keine eigene Zahl. */
          fontSize: istTitel ? `calc(${breit.toFixed(2)}cqw * var(--lb-f-titel, 1))` : `${breit.toFixed(2)}cqw`,
          lineHeight: istTitel ? 1.1 : POSTER.text.zeile,
          color: POSTER.farben.tinte,
        }}>{/**
          * ── SOLANGE ER TIPPT, GEHÖRT DER INHALT DEM BROWSER (Owner 19.09.2026: „ich tippe
          * andersrum?") ──────────────────────────────────────────────────────────────────────
          *
          * HIER STAND `{text}`, und das war der Fehler: React setzt bei jedem Tastendruck den
          * Inhalt des Feldes neu — und beim Ersetzen fällt der Cursor auf Position 0 zurück.
          * „Gani" wurde so zu „aniG". Mein Haken oben half nicht: Er verhindert nur MEIN
          * Schreiben, nicht das von React beim Abgleich.
          *
          * ZWEI BETRIEBSARTEN, EINE ZEILE:
          *  · NICHT BESCHREIBBAR (das Blatt des Künstlers): `{text}` steht im HTML — so findet
          *    es auch Google, und der Server liefert die Zeile fertig aus.
          *  · BESCHREIBBAR (sein Foto liegt im Blatt, das gibt es nur im Browser): React lässt
          *    die Finger davon, der Haken oben füllt das Feld — und nur dann, wenn niemand
          *    darin schreibt.
          */}
          {bearbeitbar ? null : text}</span>
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
