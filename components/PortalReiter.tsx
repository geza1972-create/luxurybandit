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
 * Reiter steht schwarz auf einer schwarzen Linie, der andere grau — mehr braucht es nicht.
 */
export default function PortalReiter({ reiter }: {
  reiter: { label: string; href: string; aktiv: boolean }[];
}) {
  return (
    <nav className="mt-8 flex gap-6 border-b border-[#e5e5e5]">
      {reiter.map(r => (
        <Link key={r.href} href={r.href} scroll={false}
          aria-current={r.aktiv ? "page" : undefined}
          className={`-mb-px block border-b-2 pb-3 text-[15px] no-underline transition sm:text-[16px] ${
            r.aktiv
              ? "border-[#111] font-semibold text-[#111]"
              : "border-transparent text-[#777] hover:text-[#111]"
          }`}>
          {r.label}
        </Link>
      ))}
    </nav>
  );
}
