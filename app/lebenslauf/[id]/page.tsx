import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { BESITZ_COOKIE, besitzImCookie } from "@/lib/lebenslauf-besitz-cookie";
import BesitzMelden from "@/components/BesitzMelden";
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
  /* AUCH DER TITEL VERRÄT (Owner 25.08.2026, Serversperre): „Andrei Popescu — Candidate
     profile" im Browser-Tab wäre der Name, den die Sperrseite gerade verschweigt — und er
     stünde in jeder geteilten Vorschau. Solange nicht bezahlt und der Betrachter sich nicht
     als Besitzer ausgewiesen hat, bleibt der Titel neutral. */
  const besitzCookie = (await cookies()).get(BESITZ_COOKIE)?.value ?? "";
  const darfSehen = !!profil && (profil.bezahlt === true || besitzImCookie(besitzCookie, id)
    || (!!profil.basisId && besitzImCookie(besitzCookie, profil.basisId)));
  return {
    title: !profil ? "Profil nicht gefunden"
      : darfSehen ? `${profil.name || "Profil"} — Candidate profile`
      : "Bewerbung",
    robots: { index: false, follow: false },
  };
}

/**
 * DREI TAGE OHNE ABO (Owner 25.08.2026: „er kann ohne Abo das nur 3 Tage behalten. Man
 * muss ihm sagen") — vorher waren es 30. Die kurze Frist ist der Sinn der Sache: Was
 * gratis entsteht, soll ihn zur Entscheidung bringen, nicht dauerhaft Speicher belegen.
 * WICHTIG ist der zweite Halbsatz des Owners — es muss ihm GESAGT werden, und zwar bevor
 * er baut, nicht erst wenn die Seite zu ist.
 */
const FRIST_MS = 3 * 24 * 60 * 60 * 1000;

const ABGELAUFEN: Record<string, { titel: string; zeile: string }> = {
  de: { titel: "Diese Seite ist nicht mehr online.", zeile: "Die drei Tage sind vorbei. Der Bewerber kann sie mit dem Abo sofort wieder online nehmen." },
  en: { titel: "This page is no longer online.", zeile: "The three days are over. The candidate can bring it back online instantly with the subscription." },
  ro: { titel: "Această pagină nu mai este online.", zeile: "Cele trei zile au trecut. Candidatul o poate readuce online imediat cu abonamentul." },
  es: { titel: "Esta página ya no está online.", zeile: "Los tres días han pasado. El candidato puede reactivarla al instante con la suscripción." },
  fr: { titel: "Cette page n'est plus en ligne.", zeile: "Les trois jours sont écoulés. Le candidat peut la remettre en ligne immédiatement avec l'abonnement." },
  pt: { titel: "Esta página já não está online.", zeile: "Os três dias passaram. O candidato pode reativá-la de imediato com a subscrição." },
  it: { titel: "Questa pagina non è più online.", zeile: "I tre giorni sono passati. Il candidato può riportarla online subito con l'abbonamento." },
};

/** Die Sperrseite fuer Fremde (Owner 25.08.2026, Serversperre) — sie nennt bewusst KEINEN
    Namen: Ein Fremder soll nicht einmal erfahren, wem die Adresse gehoert. */
const GESPERRT: Record<string, { titel: string; zeile: string }> = {
  de: { titel: "Diese Bewerbung ist noch nicht veröffentlicht.", zeile: "Der Bewerber hat sie noch nicht freigeschaltet. Frag ihn nach dem Link, sobald sie fertig ist." },
  en: { titel: "This application is not published yet.", zeile: "The candidate hasn't unlocked it yet. Ask them for the link once it's ready." },
  ro: { titel: "Această aplicație nu este încă publicată.", zeile: "Candidatul nu a deblocat-o încă. Cere-i linkul când este gata." },
  es: { titel: "Esta candidatura aún no está publicada.", zeile: "El candidato todavía no la ha desbloqueado. Pídele el enlace cuando esté lista." },
  fr: { titel: "Cette candidature n'est pas encore publiée.", zeile: "Le candidat ne l'a pas encore débloquée. Demande-lui le lien quand elle sera prête." },
  pt: { titel: "Esta candidatura ainda não está publicada.", zeile: "O candidato ainda não a desbloqueou. Pede-lhe o link quando estiver pronta." },
  it: { titel: "Questa candidatura non è ancora pubblicata.", zeile: "Il candidato non l'ha ancora sbloccata. Chiedigli il link quando sarà pronta." },
};

export default async function LebenslaufProfilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profil = await leseLebenslauf(id);
  /**
   * UNBEZAHLTE SEITEN GIBT ES JETZT (Owner 25.08.2026, die Gratis-Linie: „Er kann alles
   * anlegen gratis, nur er kann das nicht sharen und PDF nicht herunterladen").
   *
   * VORHER WAR DAS EIN 404: Wer nicht bezahlt hatte, hatte keine Seite — und genau das
   * macht das neue Modell unmöglich, denn der Kunde soll sein fertiges Ergebnis SEHEN,
   * bevor er zahlt. Jetzt rendert die Seite, und verschlossen sind nur Teilen und PDF
   * (siehe `bezahlt` in ExecutiveProfil und die Schlösser in LebenslaufExecutive).
   *
   * OFFEN und dem Owner gemeldet: Wer seine eigene Adresse von Hand kopiert, kann sie
   * theoretisch selbst verschicken. Das ist bewusst in Kauf genommen — die Seite ist ohne
   * Abo nach drei Tagen ohnehin zu, und ein Wasserzeichen oder eine Besitzer-Prüfung auf
   * dem Server wäre der nächste Schritt, wenn es je jemand ausnutzt.
   */
  if (!profil) notFound();

  /**
   * DIE SERVER-SPERRE (Owner 25.08.2026: „na gut, und Serversperre") — eine UNBEZAHLTE
   * Bewerbung wird an Fremde gar nicht erst ausgeliefert. Nicht ausgeblendet, nicht
   * verwischt: Der Inhalt geht nie über die Leitung, steht also auch nicht im Quelltext.
   *
   * WER DARF: das Cookie, das `/api/lebenslauf-besitz` nach der üblichen Besitz-Prüfung
   * signiert ausstellt. Der Besitzer sieht die Sperrseite genau einmal — sein Browser
   * meldet sich, das Cookie kommt, die Seite lädt neu und zeigt alles.
   */
  const besitzCookie = (await cookies()).get(BESITZ_COOKIE)?.value ?? "";
  const darfSehen = profil.bezahlt === true || besitzImCookie(besitzCookie, id)
    || (!!profil.basisId && besitzImCookie(besitzCookie, profil.basisId));
  /* HIER BLEIBT ENGLISCH DER RÜCKFALL, anders als auf den Bewerber-Flächen (Owner
     25.08.2026: „default Rumänisch bei der Bewerbung"): Diese Seite ist die, die der
     Bewerber VERSCHICKT — sie wird von der Personalabteilung geöffnet, nicht von ihm.
     Deren Browsersprache entscheidet weiterhin; wo wir sie nicht erkennen, ist Englisch
     die sichere Annahme, nicht Rumänisch. */
  const L = await resolveLang();

  /* NICHT FREIGESCHALTET: Fremde bekommen NUR diesen Hinweis — kein Name, kein Werdegang,
     kein Video. Der Besitzer meldet sich über <BesitzMelden/> und sieht danach alles. */
  if (!darfSehen) {
    const t = GESPERRT[L] ?? GESPERRT.en;
    return (
      <main className="lb-bg lb-dossier min-h-screen text-white">
        <BesitzMelden id={id} />
        <div className="mx-auto w-full max-w-[440px] px-4 pb-14 pt-10 md:max-w-[760px]">
          <article className="lb-karte overflow-hidden rounded-[20px] shadow-[0_18px_50px_rgba(0,0,0,0.38)]">
            <div className="px-5 py-8 md:px-8">
              <h1 className="font-serif text-[24px] font-black leading-tight">{t.titel}</h1>
              <p className="mt-2 text-[14px] font-bold leading-snug opacity-70">{t.zeile}</p>
            </div>
          </article>
        </div>
      </main>
    );
  }

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
   * DAS DREI-TAGE-TOR (Owner 25.08.2026): Ohne Abo ist die Seite nach 3 Tagen ZU — für
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
