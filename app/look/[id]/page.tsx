import type { Metadata } from "next";
import LookClient from "./LookClient";
import { readTryThisLookState } from "@/lib/try-this-look-store";
import { lookTitel, lookBeschreibung, lookFakten, lookAbsatz } from "@/lib/look-text";

export const dynamic = "force-dynamic";

/**
 * DIE LOOK-SEITE HAT JETZT EINEN SERVER-TEIL (Owner-Auftrag 27.08.2026: „ich will, dass sie
 * auch indexiert werden koennen").
 *
 * WAS GEMESSEN WAR: Diese Adresse lieferte FUENF Woerter aus — „LuxuryBandit — AI Marketing
 * Portal", also nur den Haustitel aus dem Wurzel-Layout. Die ganze Seite war `"use client"`;
 * der Server schickte eine leere Huelle, alles entstand erst im Browser. Deshalb hatte Google
 * 199 solcher Adressen als „Gefunden — zurzeit nicht indexiert" abgelehnt, und deshalb steht
 * im Layout daneben ein `noindex`. Das `noindex` war die FOLGE, nicht die Ursache: Wer es
 * allein entfernt, bietet Google wieder fuenf Woerter an.
 *
 * DER UMBAU IST BEWUSST KLEIN GEHALTEN. Die interaktive Seite (Anprobe, Galerie, Kommentare,
 * Konto) bleibt unveraendert als `LookClient` — 550 Zeilen erprobter Code, an denen nichts
 * kaputtgehen soll. Darueber steht jetzt ein Server-Block, der dasselbe Teil in echtem HTML
 * beschreibt: Ueberschrift, Absatz, Fakten. Er kommt aus `lib/look-text.ts` und erfindet
 * nichts — fehlt ein Feld, faellt die Zeile weg.
 *
 * DAS `noindex` BLEIBT VORERST STEHEN (app/look/[id]/layout.tsx). Die Seiten tragen erfundene
 * Kommentare mit erfundenen Namen (`SEED_TEXTS`/`SEED_NAMES` in LookClient, vermischt mit den
 * echten). Sie oeffentlich in Suchergebnisse zu stellen, waere eine Taeuschung von Kaeufern
 * und faellt in der EU unter das Verbot gefaelschter Verbraucherbewertungen (§ 5b UWG);
 * Google fuehrt sie in den Spam-Richtlinien und straft die Domain, nicht die Seite. Der
 * Server-Teil hier ist die Vorarbeit — das Freischalten ist danach eine Zeile im Layout.
 */

/**
 * DIE ADRESSE TRAEGT DIE KENNUNG HINTER EINEM DOPPEL-BINDESTRICH
 * („lesbarer-slug--look-1784190559143"). Dieselbe Aufloesung wie im Client
 * (LookClient, `extractId`) — ohne sie fand der Server nichts und lieferte weiter
 * die leere Huelle aus, was beim ersten Anlauf genau so passiert ist.
 */
function kennungAusAdresse(param: string): string {
  const i = param.lastIndexOf("--");
  return i >= 0 ? param.slice(i + 2) : param;
}

async function ladeLook(param: string) {
  try {
    const state = await readTryThisLookState();
    const id = kennungAusAdresse(param);
    return state.looks.find(l => l.id === id || l.id === param) ?? null;
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const look = await ladeLook(id);
  if (!look) return {};
  return {
    title: `${lookTitel(look)} | LuxuryBandit`,
    description: lookBeschreibung(look),
  };
}

export default async function LookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const look = await ladeLook(id);

  return (
    <>
      {/* DER SERVER-TEIL — das Einzige, was ein Crawler ohne JavaScript sieht. Er steht
          bewusst NICHT versteckt: Was nur fuer Suchmaschinen da ist und Besuchern
          vorenthalten wird, ist Cloaking. Derselbe Text, dieselbe Seite. */}
      {look && (
        /* `pt-20`: Der Zurueck-Pfeil des Clients liegt fest oben links — ohne Abstand
           steht die Ueberschrift darunter. Eigener dunkler Grund, damit der Block nicht
           auf dem Video-Hintergrund der Seite ausbleicht. */
        <section className="bg-[#0d0c0a] px-5 pb-6 pt-20 text-white">
          <div className="mx-auto w-full max-w-[720px]">
          <h1 className="text-[26px] font-black leading-tight text-white">{lookTitel(look)}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-white/75">{lookAbsatz(look)}</p>

          {lookFakten(look).length > 0 && (
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13.5px]">
              {lookFakten(look).map(f => (
                <div key={f.k} className="contents">
                  <dt className="font-black text-white/40">{f.k}</dt>
                  <dd className="text-white/85">{f.v}</dd>
                </div>
              ))}
            </dl>
          )}
          </div>
        </section>
      )}

      <LookClient />
    </>
  );
}
