"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Film } from "lucide-react";
import EinladungKarte from "@/components/EinladungKarte";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import TeilenKnopf from "@/components/TeilenKnopf";
import { ARMEE_MUSIK } from "@/lib/armee-musik";
import { Knopf } from "@/components/CI";

export type AcademyVideo = {
  id: string; wann: string; einsatz: string; vorname: string; videoUrl: string; poster: string;
};

type Stand = { video: AcademyVideo | null; laeuft: boolean };

/**
 * DAS LETZTE, WAS AUF DIESEM GERÄT ENTSTANDEN IST — ohne Konto, ohne Anmeldung.
 *
 * Owner 02.09.2026: „Der User muss sein Video dort sehen. Es soll nicht springen. Dann machst
 * du hier eine neue Funktion" · „oder besser Aktuelle Generierungen" · „dann blinkt es dort,
 * wenn jemand generiert. Es wird dort nur das letzte Video angezeigt. Wenn jemand ein neues
 * generiert, dann wird es überschrieben. Das ist für öffentliche Displays konzipiert."
 *
 * DER LETZTE SATZ ERKLÄRT ALLES ANDERE. Ein Bildschirm auf einer Messe ist EIN Gerät für
 * viele Menschen: Eine Sammlung würde jedem Nächsten die Gesichter aller Vorherigen zeigen.
 * Genau ein Video, überschrieben vom nächsten Lauf, löst beides — wer gerade fertig ist,
 * findet seines wieder, und wer danach kommt, sieht nur sein eigenes.
 *
 * DIE KENNUNG STEHT IM BROWSER (`lb_visitor`) — dieselbe, die an jedem Auftrag hängt. Sie
 * entsteht ohne Zutun des Besuchers, und wer sie nicht hat, rät sie nicht. Eine Abfrage nach
 * E-Mail wäre gefährlich: Die Adresse eines Bewerbers kennt man leicht.
 */
function useStand(takt = 0): Stand | null {
  const [stand, setStand] = useState<Stand | null>(null);

  const holen = useCallback(async () => {
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /* privater Modus */ }
    if (!device) return { video: null, laeuft: false };
    try {
      const r = await fetch(`/api/academy-videos?device=${encodeURIComponent(device)}`, { cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      return { video: d?.video ?? null, laeuft: !!d?.laeuft };
    } catch { return { video: null, laeuft: false }; }
  }, []);

  useEffect(() => {
    let weg = false;
    void holen().then(s => { if (!weg) setStand(s); });
    /**
     * NACHFASSEN, SOLANGE ETWAS LÄUFT (`takt` in Sekunden, 0 = einmal holen).
     *
     * Am Display steht die Seite manchmal stundenlang offen, während vorne jemand ein Video
     * erzeugt. Ohne Nachfassen bliebe der Chip stehen, wie er beim Laden aussah — und wer
     * fertig ist, fände sein Video nur nach einem Neuladen, auf das er nicht kommt.
     */
    if (!takt) return () => { weg = true; };
    const uhr = setInterval(() => { void holen().then(s => { if (!weg) setStand(s); }); }, takt * 1000);
    return () => { weg = true; clearInterval(uhr); };
  }, [holen, takt]);

  return stand;
}

/**
 * DER CHIP IM KOPF — er blinkt, solange gerechnet wird.
 *
 * Er zeigt sich nur, wenn es etwas zu zeigen gibt: Ein Knopf „Generierungen" im Kopf einer
 * Anzeigen-Landingpage wäre sonst ein Versprechen auf eine leere Seite, und er stünde genau
 * dort, wo der Besucher zum ersten Mal hinsieht.
 *
 * `lb-puls` ist die Haus-Animation des Assets-Chips (globals.css) — an dessen Stelle er
 * steht, mit derselben Bedeutung („hier entsteht gerade etwas von dir"), also derselben
 * Auszeichnung. Alle 12 Sekunden nachfassen: oft genug, dass ein fertiges Video von selbst
 * auftaucht, selten genug, dass ein Display es nicht merkt.
 */
export function GenerierungenChip({ label, href }: { label: string; href: string }) {
  const stand = useStand(12);
  if (!stand || (!stand.video && !stand.laeuft)) return null;

  return (
    <Link href={href}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13.5px] font-black transition active:scale-95 ${
        stand.laeuft
          ? "lb-puls border-[#f6cf51]/40 bg-[#f6cf51]/10 text-[#f6cf51]"
          : "border-[#f6cf51]/60 bg-[#f6cf51]/10 text-[#f6cf51]"}`}>
      <Film className="h-3.5 w-3.5" />
      {label}
      {/* Der Punkt bleibt zusätzlich: Er sagt „etwas ist NEU", der Puls sagt „es läuft
          gerade" — zusammen sieht man es aus dem Augenwinkel (wie am Assets-Chip). */}
      {stand.laeuft && <span aria-hidden className="ml-0.5 h-2 w-2 animate-pulse rounded-full bg-[#f6cf51]" />}
    </Link>
  );
}

/**
 * DIE ANSICHT — genau ein Video, oder der Grund, warum keines da ist.
 *
 * Sie fasst schneller nach als der Chip (5 s): Wer hier steht, WARTET; im Kopf einer anderen
 * Seite tut das niemand.
 */
export function GenerierungenAnsicht({ texte, sprache, marke }: {
  texte: {
    lead: string; leerTitel: string; leerText: string; laedt: string; laeuftText: string;
    ton: string; tonAus: string; gross: string; klein: string;
    teilen: string; teilenKopiert: string; teilenText: string;
  };
  sprache: string;
  /** Steht als Titel auf der Karte, wenn der Vorname fehlt. */
  marke: string;
}) {
  const stand = useStand(5);

  if (!stand) {
    return <p className="mt-6 text-center text-[14.5px] font-bold text-white/60">{texte.laedt}</p>;
  }

  /* Läuft noch etwas und ist noch nichts fertig: Das ist die Lage, in der jemand hierher
     kommt, weil er sich verklickt hat. Ihm zu sagen „nichts da" wäre falsch — es entsteht
     ja gerade. */
  if (!stand.video) {
    return (
      <div className="mt-6 rounded-2xl border border-white/15 bg-white/[0.04] p-5 text-center">
        <p className="text-[17px] font-black text-white">{stand.laeuft ? texte.laeuftText : texte.leerTitel}</p>
        {!stand.laeuft && (
          <p className="mt-1.5 text-[14.5px] font-semibold leading-snug text-white/75">{texte.leerText}</p>
        )}
      </div>
    );
  }

  const v = stand.video;
  return (
    <>
      <p className="mt-2 text-[15px] font-medium leading-snug text-white/80">{texte.lead}</p>
      {/**
        * DIE KARTE STEHT HIER, NICHT IN DER SEITE (02.09.2026, aus dem Produktionsbetrieb
        * gelernt: „Functions cannot be passed directly to Client Components").
        *
        * Sie kam vorher als Funktion von der Server-Seite herein — das ist die eine Sache,
        * die eine Server-Komponente einer Client-Komponente nicht reichen kann. Die
        * Kartenbausteine sind ohnehin alle client-fähig; sie gehören also hierher, und die
        * Seite reicht nur noch Wörter.
        */}
      <div className="mt-4">
        <EinladungKarte sprache={sprache} sie="" er="" demo
          titel={v.vorname || marke} botschaft=""
          video={
            <EinladungAnsicht
              id="" videoUrl={v.videoUrl} poster={v.poster || undefined}
              zaehlen={false} musik={ARMEE_MUSIK} schleife
              /* Durchlaufen statt Stehenbleiben — wie im Trichter (Owner 02.09.2026: „das
                 Video darf nicht 10 Sek stehen bleiben am Ende"). Am Display heisst das:
                 Wer vorbeikommt, sieht immer Bewegung, nie ein totes Standbild. */
              verhaeltnis="aspect-[2/3]"
              tonText={texte.ton} tonAusText={texte.tonAus}
              grossText={texte.gross} kleinText={texte.klein}
              teilen={<TeilenKnopf rund url={v.videoUrl} text={texte.teilenText}
                label={texte.teilen} kopiertLabel={texte.teilenKopiert} />}
            />
          }
        />
      </div>
    </>
  );
}

/**
 * DAS GETEILTE VIDEO — wie im Trichter, nur ohne Trichter drumherum.
 *
 * Owner 02.09.2026: „wenn ich es share, kommt nur das Rohvideo an, ohne nichts. Es muss das
 * Original ankommen, mit Schrift und Musik" · „und Loop".
 *
 * Alles drei steckt hier: die Schrift als Überlagerung IM Video (geht damit auch ins
 * Vollbild mit), die Haus-Musik daneben, und `schleife` für den Loop. Eine mp4 kann keines
 * davon tragen — deshalb verschickt der Teilen-Knopf die Adresse dieser Seite.
 *
 * UND EIN WEG WEITER: Wer das hier bekommt, hat gerade gesehen, was das Ding kann. Der Knopf
 * darunter führt ihn auf die Landingpage — so bringt ein Bewerber den nächsten, und das ist
 * der billigste Kanal, den dieser Trichter hat.
 */
export function GeteiltesVideo({ video, poster, vorname, sprache, marke, texte, selbstHref }: {
  video: string;
  poster: string;
  vorname: string;
  sprache: string;
  marke: string;
  texte: {
    ton: string; tonAus: string; gross: string; klein: string;
    teilen: string; teilenKopiert: string; teilenText: string;
    abspannEins: string; abspannZwei: string; selbst: string;
  };
  selbstHref: string;
}) {
  return (
    <>
      <EinladungKarte sprache={sprache} sie="" er="" demo
        titel={vorname || marke} botschaft=""
        video={
          <EinladungAnsicht
            id="" videoUrl={video} poster={poster || undefined}
            zaehlen={false} musik={ARMEE_MUSIK} schleife
            verhaeltnis="aspect-[2/3]"
            tonText={texte.ton} tonAusText={texte.tonAus}
            grossText={texte.gross} kleinText={texte.klein}
            teilen={<TeilenKnopf rund text={texte.teilenText}
              label={texte.teilen} kopiertLabel={texte.teilenKopiert} />}
            /* Der Abspann steht durchgehend und geht ins Vollbild mit — dieselbe Regel wie
               im Trichter. Ohne Namen bliebe „Danke ." stehen, also nur mit. */
            /* Dunkler Verlauf unter dem Text — die Begründung steht in `ArmeeFunnel`, wo
               derselbe Abspann liegt: Weiss auf einem hellen Videobild ist ohne Grund nicht
               zu lesen, und ein Schlagschatten trägt nur gegen mittlere Töne. */
            ueberlagerung={vorname ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-6 pb-6 pt-20 text-center">
                <p data-aufmedien="1" className="text-[24px] font-black leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                  {texte.abspannEins.replace("{name}", vorname)}
                </p>
                <p data-aufmedien="1" className="mt-1.5 text-[18px] font-black text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
                  {texte.abspannZwei}
                </p>
                {/* DER EINE KNOPF STEHT IM ABSPANN (Owner 02.09.2026: „auch in Vollbildvideo",
                    dann „unten raus" für den zweiten, der bis eben zusätzlich unter der
                    Karte stand). So bleibt er in jeder Grösse sichtbar — klein wie gross —
                    ohne doppelt aufzutauchen. `stopPropagation` verhindert, dass der Tipp
                    zugleich die Fläche darunter trifft (dieselbe Falle wie beim
                    `perMail`-Knopf in `ArmeeFunnel`). */}
                <div className="pointer-events-auto mx-auto mt-3 max-w-[240px]"
                  onClick={e => e.stopPropagation()}>
                  <Knopf art="gold" href={selbstHref}>{texte.selbst}</Knopf>
                </div>
              </div>
            ) : undefined}
          />
        }
      />
    </>
  );
}
