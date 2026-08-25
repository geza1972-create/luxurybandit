import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LebenslaufExecutive from "@/components/LebenslaufExecutive";
import ProfilAssistent from "@/components/ProfilAssistent";
import ProfilBewerbungen from "@/components/ProfilBewerbungen";
import ProfilAbo from "@/components/ProfilAbo";
import KontoChip from "@/components/KontoChip";
import SeitenFuss from "@/components/SeitenFuss";
import { eur, LEBENSLAUF_MONAT_CENTS } from "@/lib/pricing";
import { leseLebenslauf } from "@/lib/lebenslauf-store";
import { executiveAusProfil } from "@/lib/lebenslauf-vorlage";
import { executiveInSprache } from "@/lib/lebenslauf-uebersetzen";
import { resolveLang } from "@/lib/lang-server";

/**
 * DIE GENERIERTE PROFILSEITE RENDERT DIE EXECUTIVE-VORLAGE (Owner 24.08.2026: „unter der
 * Landingpage die Seite, die der User bekommt … Die Leute kaufen was sie sehen").
 *
 * Bis heute stand hier ein eigener Aufbau (weisse Karten untereinander) NEBEN der fertigen
 * Vorlage `/lebenslauf/executive` — das Beispiel zeigte also eine andere Seite, als der
 * Käufer bekam. Genau das ist jetzt geschlossen: Beispielseite und echte Seite sind EIN
 * Baustein (`components/LebenslaufExecutive.tsx`); die Rohdaten aus dem Speicher übersetzt
 * `executiveAusProfil` (lib/lebenslauf-vorlage.ts) — Abschnitte ohne Daten blendet die
 * Vorlage selbst aus. Der alte Aufbau liegt in der Git-Historie (Stand 23.08.2026).
 *
 * KEIN „made by luxurybandit.com", keine Geschenk-Navigation (Memory
 * `lebenslauf-executive-vorlage`): Der Bewerber-Bereich ist ein eigenes Produkt; die
 * Vorlage bringt ihren eigenen Kopf (`TalentKopf`) und Fuss mit.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const profil = await leseLebenslauf(id);
  return {
    title: profil ? `${profil.name || "Profil"} — Candidate profile` : "Profil nicht gefunden",
    robots: { index: false, follow: false },
  };
}

/** „Ohne Abo bleibt deine Seite 30 Tage erreichbar." (Owner-Seitentext 24.08.2026). */
const FRIST_MS = 30 * 24 * 60 * 60 * 1000;

const ABGELAUFEN: Record<string, { titel: string; zeile: string }> = {
  de: { titel: "Diese Seite ist nicht mehr online.", zeile: "Die 30 Tage sind vorbei. Der Bewerber kann sie mit dem Abo sofort wieder online nehmen." },
  en: { titel: "This page is no longer online.", zeile: "The 30 days are over. The candidate can bring it back online instantly with the subscription." },
  ro: { titel: "Această pagină nu mai este online.", zeile: "Cele 30 de zile au trecut. Candidatul o poate readuce online imediat cu abonamentul." },
  es: { titel: "Esta página ya no está online.", zeile: "Los 30 días han pasado. El candidato puede reactivarla al instante con la suscripción." },
  fr: { titel: "Cette page n'est plus en ligne.", zeile: "Les 30 jours sont écoulés. Le candidat peut la remettre en ligne immédiatement avec l'abonnement." },
  pt: { titel: "Esta página já não está online.", zeile: "Os 30 dias passaram. O candidato pode reativá-la de imediato com a subscrição." },
  it: { titel: "Questa pagina non è più online.", zeile: "I 30 giorni sono passati. Il candidato può riportarla online subito con l'abbonamento." },
};

export default async function LebenslaufProfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profil = await leseLebenslauf(id);
  if (!profil || !profil.bezahlt) notFound();
  /* HIER BLEIBT ENGLISCH DER RÜCKFALL, anders als auf den Bewerber-Flächen (Owner
     25.08.2026: „default Rumänisch bei der Bewerbung"): Diese Seite ist die, die der
     Bewerber VERSCHICKT — sie wird von der Personalabteilung geöffnet, nicht von ihm.
     Deren Browsersprache entscheidet weiterhin; wo wir sie nicht erkennen, ist Englisch
     die sichere Annahme, nicht Rumänisch. */
  const L = await resolveLang();

  /* MULTI-BEWERBUNG (25.08.2026): Eine Bewerbungs-Version trägt `basisId` — Abo und
     30-Tage-Frist hängen IMMER am Hauptprofil, eine Bewerbung lebt nie länger als es. */
  const basis = profil.basisId ? await leseLebenslauf(profil.basisId) : null;
  const traeger = basis ?? profil;

  const erstellt = Date.parse(traeger.erstelltAm ?? "") || Date.now();
  const restTage = Math.max(0, Math.ceil((erstellt + FRIST_MS - Date.now()) / (24 * 60 * 60 * 1000)));
  const abgelaufen = !traeger.aboAktiv && Date.now() - erstellt > FRIST_MS;

  /* DIE BESITZER-WERKZEUGE — EIN CHAT STATT VIELER KÄSTEN (Owner 25.08.2026: „am
     einfachsten ist es immer im Form von chat … statt tausend Funktionen auf der Seite
     aufzulisten"): Der Assistent macht (Anzeige prüfen, Bewerbung erstellen, Änderungen),
     die Liste findet wieder, das Abo bezahlt — mehr Kästen gibt es nicht. Auf einer
     BEWERBUNG steht zuerst ihre Herkunft samt Anschreiben, das Abo wohnt nur am
     Hauptprofil. Jeder Baustein prüft den Besitz selbst beim Server und bleibt für
     jeden anderen unsichtbar. */
  /* JEDES ELEMENT MIT EXPLIZITEM KEY (24.08.2026, gemessen): Ohne sie meldet React „Each
     child in a list should have a unique key prop, check the render method of TalentKopf" —
     eine RSC-Eigenart, wenn ein Server Component fertige Elemente über eine Prop (hier
     `werkzeug`/`konto`) an ein Client Component reicht. Kostet nichts, behebt die Meldung. */
  const werkzeug = profil.basisId ? (
    <>
      <ProfilBewerbungen key="bewerbungen" id={id} lang={L} />
      <ProfilAssistent key="assistent" id={id} lang={L} />
    </>
  ) : (
    <>
      <ProfilAssistent key="assistent" id={id} lang={L} />
      <ProfilBewerbungen key="bewerbungen" id={id} lang={L} />
      <ProfilAbo key="abo" id={id} aboAktiv={profil.aboAktiv === true}
        monatPreis={eur(LEBENSLAUF_MONAT_CENTS, L)} restTage={restTage} lang={L} />
    </>
  );

  /**
   * DAS 30-TAGE-TOR (Owner-Seitentext): Ohne Abo ist die Seite nach 30 Tagen ZU — für
   * Firmen steht nur noch der Ablauf-Hinweis da. Gelöscht wird nichts; der BESITZER sieht
   * auf derselben Adresse seine Werkzeuge (Besitz-Prüfung im Browser) und reaktiviert mit
   * einem Tipp — danach rendert wieder das volle Dossier.
   */
  if (abgelaufen) {
    const t = ABGELAUFEN[L] ?? ABGELAUFEN.en;
    return (
      <main className="lb-bg lb-dossier min-h-screen text-white">
        <div className="mx-auto w-full max-w-[440px] px-4 pb-14 pt-10 md:max-w-[760px]">
          <article className="lb-karte overflow-hidden rounded-[20px] shadow-[0_18px_50px_rgba(0,0,0,0.38)]">
            <div className="px-5 py-8 md:px-8">
              <h1 className="font-serif text-[24px] font-black leading-tight">{t.titel}</h1>
              <p className="mt-2 text-[13px] font-bold leading-snug opacity-70">{t.zeile}</p>
            </div>
            {werkzeug}
          </article>
        </div>
        <SeitenFuss art="schlicht" className="md:max-w-[760px]" />
      </main>
    );
  }

  /* DER INHALT FOLGT DEM SPRACHSCHALTER (Owner 24.08.2026: „diese Seite soll man übersetzen
     können") — einmal je Sprache über die Haus-Übersetzung, danach aus dem Dauer-Cache. */
  const exec = await executiveInSprache(executiveAusProfil(profil, L), L);
  return <LebenslaufExecutive profil={exec} lang={L} werkzeug={werkzeug} konto={<KontoChip key="konto" />} />;
}
