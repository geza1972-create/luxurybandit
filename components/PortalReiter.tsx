import Link from "next/link";

/**
 * REITER ÜBER DEM RASTER — „Kunstwerke" und „Künstler" (Owner 13.09.2026: „wir brauchen über die
 * Feeds Tabs. Kunstwerke und Künstler").
 *
 * ── WARUM LINKS UND KEINE KNÖPFE ────────────────────────────────────────────────────────────
 *
 * `components/AdminTabs.tsx` macht dasselbe mit `useState` und merkt sich die Wahl im Gerät. Das
 * ist im Admin richtig — dort sieht niemand zu. Hier nicht:
 *
 *   • Google muss beide Ansichten finden. Ein Reiter, der nur im Browser umschaltet, hat keine
 *     eigene Adresse — die Künstlerliste wäre für die Suche unsichtbar.
 *   • Der Zurück-Knopf muss zurückführen. Mit `useState` springt er aus der Seite heraus.
 *   • Ohne JavaScript bleibt die Seite bedienbar.
 *
 * Deshalb: echte Adressen (`?ansicht=kuenstler`), serverseitig gerendert.
 *
 * ── UND KEIN VERSUSFORGE-GOLD ───────────────────────────────────────────────────────────────
 *
 * `AdminTabs` ist Gold auf Dunkel. Das Portal ist bewusst weiss-schwarz, „die einzige Farbe sind
 * die Werke" (app/portal/page.tsx). Übernommen ist das Muster, nicht das Aussehen: Der aktive
 * Reiter steht schwarz auf einer schwarzen Linie, der andere grau.
 *
 * ── SIE SIND KNÖPFE, NICHT WÖRTER (Owner 19.09.2026: „die muss man richtig hervorheben wie
 * Labels, fett" → „brauche schwarze Labels mit weisser Schrift" · „Buttons") ────────────────
 *
 * Erst waren es vier graue Wörter in Fliesstextstärke — sie gingen auf einem weissen Blatt
 * voller grauer Sätze unter. Dann Versalien mit Sperrung und ein Strich darunter: besser lesbar,
 * aber immer noch TEXT. Wer nicht weiss, dass es hier Kategorien gibt, sieht eine Zeile Wörter
 * und liest darüber hinweg.
 *
 * JETZT SIND ES KNÖPFE. Der aktive schwarz gefüllt mit weisser Schrift, die anderen mit Rand auf
 * Weiss — ein Umriss sagt „hier kann man drücken", eine Füllung sagt „hier stehst du". Das ist
 * die teuerste Stelle der Seite: Wer die Reiter übersieht, sieht nur die Startseite.
 *
 * NICHTS SPRINGT BEIM WECHSELN: Beide Zustände tragen dieselbe Polsterung und dieselbe
 * Randstärke, nur die Farben wechseln (Hausregel `ci-design`: „Auswahl verschiebt NIE").
 *
 * KEINE RUNDEN ECKEN — Owner-Regel fürs Portal (18.09.2026: „die nicht mit runden Ecken").
 *
 * 13,5 PX IST DER BODEN für Versalien mit Sperrung — sie bauen breiter, als die Punktzahl
 * vermuten lässt (Skill `ci-design`, „Schriftgrössen-Boden").
 */
export default function PortalReiter({ reiter }: {
  reiter: { label: string; href: string; aktiv: boolean }[];
}) {
  return (
    /* `lb-wisch` statt Umbruch: Vier Versalien-Etiketten sind breiter als ein Telefon — ohne die
       Wischfläche fiele „Living Poster" in eine zweite Zeile und säse allein unter den anderen. */
    /**
     * ── UMBRUCH STATT WISCHEN (Owner 19.09.2026: „Buttons untereinander, nicht als Slide") ────
     *
     * Erst lagen die fünf Knöpfe in einer Wischfläche: Auf dem Telefon sah man drei, der Rest
     * lag rechts ausserhalb. Eine Kategorie, die man wegwischen muss, findet niemand — und
     * anders als bei einer Reihe Poster gibt es hier nichts zu entdecken, sondern eine
     * Entscheidung zu treffen. Alle Möglichkeiten gehören gleichzeitig ins Bild.
     *
     * `flex-wrap`: Sie füllen die Zeile und brechen um. Am Rechner steht weiter alles in einer.
     */
    <nav className="mt-8 flex flex-wrap gap-2.5 sm:gap-3">
      {reiter.map(r => (
        <Link key={r.href} href={r.href} scroll={false}
          aria-current={r.aktiv ? "page" : undefined}
          className={`block border-2 px-4 py-2.5 text-[13.5px] uppercase tracking-[0.12em] no-underline transition sm:px-5 sm:text-[14px] ${
            r.aktiv
              ? "border-[#111] bg-[#111] font-black text-white"
              : "border-[#dfe4e9] bg-white font-bold text-[#555] hover:border-[#111] hover:text-[#111]"
          }`}>
          {r.label}
        </Link>
      ))}
    </nav>
  );
}
