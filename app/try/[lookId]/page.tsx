import type { Metadata } from "next";
import TryFunnelClient from "./TryFunnelClient";
import { readTryThisLookState } from "@/lib/try-this-look-store";
import { lookTitel, lookBeschreibung, lookFakten, lookAbsatz } from "@/lib/look-text";

export const dynamic = "force-dynamic";

/**
 * DIE LINGERIE-ANPROBE BEKOMMT EINEN SERVER-TEIL (Owner-Auftrag 28.08.2026: „es muss
 * indexiert werden mit seo genauso mit lingerie tryon" · „und lingerie video
 * generierungen" · „das kann keiner").
 *
 * DERSELBE BEFUND WIE BEI DEN LOOK-SEITEN (siehe app/look/[id]/page.tsx, 27.08.2026): Diese
 * Datei war komplett `"use client"` — der Server schickte eine leere Huelle, der Titel und
 * die Bilder entstanden erst im Browser. Ein Crawler ohne JavaScript sah nur den Haustitel
 * aus dem Wurzel-Layout. Derselbe kleine Umbau: die interaktive Seite (Model waehlen,
 * Anprobe, Kasse) bleibt unveraendert als `TryFunnelClient` — nichts daran aendert sich —,
 * darueber steht jetzt ein Server-Block mit echtem HTML: Ueberschrift, Absatz, Fakten.
 * Text kommt aus `lib/look-text.ts` (dieselbe Quelle wie die Look-Seiten) plus EINEM festen
 * Zusatz, der die Video-Erzeugung nennt — das ist das Alleinstellungsmerkmal dieser Seite
 * gegenueber einer reinen Look-Seite, und der Grund, warum sie eine eigene Adresse verdient.
 *
 * ANDERS ALS DIE LOOK-SEITEN: KEIN `noindex`. Deren Sperre kommt von erfundenen Kommentaren
 * mit erfundenen Namen (SEED_TEXTS/SEED_NAMES in LookClient) — eine Taeuschung, die die EU
 * unter das Verbot gefaelschter Verbraucherbewertungen stellt (§ 5b UWG). Diese Seite zeigt
 * so etwas nicht: `examplesRow` in `TryFunnelClient` sind ECHTE, bereits erzeugte
 * Community-Try-ons (`communityTryOns`), keine erfundenen Namen oder Bewertungen.
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

export async function generateMetadata({ params }: { params: Promise<{ lookId: string }> }): Promise<Metadata> {
  const { lookId } = await params;
  const look = await ladeLook(lookId);
  if (!look) return {};
  const titel = lookTitel(look);
  return {
    title: `${titel} — AI lingerie try-on video | LuxuryBandit`,
    description: `${lookBeschreibung(look)} An AI lingerie video, on any model — nobody else offers this.`,
  };
}

export default async function TryFunnelPage({ params }: { params: Promise<{ lookId: string }> }) {
  const { lookId } = await params;
  const look = await ladeLook(lookId);

  return (
    <>
      <TryFunnelClient />

      {/* DER SERVER-TEIL — steht bewusst NACH dem Trichter, nicht davor (28.08.2026, selbst
          nachgestellt): `TryFunnelClient` traegt seinen eigenen Kopf (Logo, Konto, Guthaben)
          im normalen Fluss, nicht schwebend wie der Zurueck-Pfeil der Look-Seiten. Stand der
          Server-Text DAVOR, rutschte dieser Kopf mitten in die Seite statt an ihren Anfang.
          Fuer die Auffindbarkeit macht die Reihenfolge im HTML keinen Unterschied — ein
          Crawler liest den ganzen Body, nicht nur den Anfang; nur Besucher sehen zuerst den
          Trichter und darunter denselben Text (kein Cloaking, nichts versteckt). */}
      {look && (
        <section className="bg-[#0d0b0a] px-5 py-6 text-white">
          <div className="mx-auto w-full max-w-[440px]">
            <h1 className="text-[26px] font-black leading-tight text-white">{lookTitel(look)} — AI lingerie try-on video</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-white/75">
              {lookAbsatz(look)} Pick any model, watch her wear it and turn — an AI lingerie video generator nobody else offers.
            </p>
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
    </>
  );
}
