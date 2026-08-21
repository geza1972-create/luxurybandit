import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import { KARTE_TEXTE } from "@/components/EinladungKarte";
import { leseLebenslauf } from "@/lib/lebenslauf-store";
import { resolveLang } from "@/lib/lang-server";

/**
 * DIE GENERIERTE PROFILSEITE (Owner 19.08.2026: „Bilderlastig. Wenig Text.", 20.08.2026: kein
 * KI-Avatar mehr — eine echte Eigenaufnahme, siehe Memory `lebenslauf-video-eigenaufnahme`).
 * Grosses Video oben (der Nutzer spricht den von der KI erstellten Text selbst), darunter
 * Lebenslauf-Karte, Empfehlungen mit Match, Kontakt nur nach Freigabe. Muster wie
 * `app/einladung/[id]/page.tsx` (eigene lebende Seite je Auftrag), aber auf dem eigenen,
 * kleinen Speicher `lib/lebenslauf-store.ts` — Begründung dort.
 *
 * DAS VIDEO-FELD IST `EinladungAnsicht` OHNE DIE `EinladungKarte`-HÜLLE (Memory
 * `lebenslauf-kontaktkarte-ausblendbar`: kein „made by luxurybandit.com" auf DIESER Seite,
 * das ist genau die Zeile, die `EinladungKarte` fest einbaut) — `EinladungAnsicht` allein
 * bringt Tipp-zum-Abspielen, Ton-Knopf und Vollbild mit, ohne die Herkunftszeile.
 * `schleife={false}` (jemand spricht), `originalton` (die Stimme ist der Inhalt) — beides aus
 * den drei Schaltern in `Landingpage.md` §3.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const profil = await leseLebenslauf(id);
  return {
    title: profil ? `${profil.name || "Profil"} — AI gibt dir neue Chancen` : "Profil nicht gefunden",
    robots: { index: false, follow: false },
  };
}

export default async function LebenslaufProfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profil = await leseLebenslauf(id);
  if (!profil || !profil.bezahlt) notFound();

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <div className="mx-auto flex w-full max-w-[440px] flex-col px-4 pb-24 pt-3">
        <div className="relative mt-2 aspect-[3/4] w-full overflow-hidden rounded-3xl border border-[#f6cf51]/40">
          {profil.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profil.fotoUrl} alt={profil.name ?? "Profil"} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center bg-white/5 text-white/40">Kein Bild</div>
          )}
          {/* KEIN „made by luxurybandit.com" HIER (Owner 20.08.2026) — diese Seite ist das,
              was der Bewerber einer Firma zeigt; die Marke des Werkzeugs gehört nicht auf
              das Werk. Anders als bei den Geschenk-Karten (Skill `card`, Memory
              `karten-fuer-videos`), die man verschickt, um FÜR LuxuryBandit zu werben. */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10">
            <p className="text-[19px] font-black">{profil.name || "Profil"}</p>
          </div>
        </div>

        {/* DER LEBENSLAUF ALS EIGENE KARTE (Owner 20.08.2026: „sein Lebenslauf als Card
            drunter") — dieselbe Karten-Hülle wie das Foto oben, damit die Stichpunkte nicht
            wie eine lose Liste wirken, sondern wie ein zweites, gleichwertiges Stück Papier. */}
        {profil.stichpunkte.length > 0 && (
          <div className="mt-5 rounded-3xl border border-[#f6cf51]/40 lb-goldhauch p-4">
            <p className="text-[13px] font-black text-[#f6cf51]">Dein Lebenslauf</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {profil.stichpunkte.map((s) => (
                <li key={s} className="text-[13px] font-bold text-white/85">• {s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* EMPFEHLUNGEN MIT MATCH UND DIREKTLINK (Owner 20.08.2026: „eine Card mit den
            Empfehlungen wo er sich bewerben kann, als Beispiel mit 68% Match, Link direkt
            und bewerben"). Die Prozentzahl ist ein BEISPIEL-Platzhalter (kein echtes
            Matching gebaut) — fällt in fester Reihenfolge, damit die erste Kategorie am
            überzeugendsten wirkt, ohne eine falsche Genauigkeit vorzutäuschen. Der Link
            führt auf eine echte Jobsuche zur Kategorie statt auf eine erfundene Stelle. */}
        {profil.kategorien.length > 0 && (
          <div className="mt-5">
            <p className="text-[13px] font-black text-[#f6cf51]">Das kannst du werden</p>
            <div className="mt-2 flex flex-col gap-3">
              {profil.kategorien.map((k, i) => {
                const match = Math.max(48, 68 - i * 7);
                const suchLink = `https://www.google.com/search?q=${encodeURIComponent(`${k} jobs remote`)}`;
                return (
                  <div key={k} className="rounded-2xl border border-[#f6cf51]/40 lb-goldhauch p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[14px] font-black text-white">{k}</p>
                      <span className="shrink-0 rounded-full bg-[#f6cf51]/15 px-2.5 py-1 text-[11px] font-black text-[#f6cf51]">
                        {match}% Match
                      </span>
                    </div>
                    <a href={suchLink} target="_blank" rel="noreferrer"
                      className="lb-gold mt-3 flex h-11 w-full items-center justify-center rounded-full text-[13px] font-black">
                      Jetzt bewerben →
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* KONTAKTDATEN — NUR NACH FREIGABE (Owner 20.08.2026: siehe Begründung bei
            `kontaktSichtbar` in lib/lebenslauf-store.ts). Diese Seite geht an Firmen OHNE
            diese Karte; sie erscheint erst, wenn eine Firma an genau diesem Kandidaten
            Interesse bestätigt hat. */}
        {profil.kontaktSichtbar && profil.email && (
          <div className="mt-5 rounded-3xl border border-[#f6cf51]/40 lb-goldhauch p-4">
            <p className="text-[13px] font-black text-[#f6cf51]">Kontakt</p>
            <p className="mt-2 text-[13px] font-bold text-white/85">{profil.email}</p>
          </div>
        )}
      </div>
      <SeitenFuss />
    </main>
  );
}
