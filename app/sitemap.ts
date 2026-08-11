import type { MetadataRoute } from "next";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://luxurybandit.com").replace(/\/$/, "");

// Regenerate hourly so new looks/curators get into the index without a redeploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    // „/" ist die Startseite und liefert die Themen selbst aus (app/page.tsx). /themes zeigt
    // dieselbe Seite, nennt aber „/" als kanonische Fassung — eine Adresse, die auf eine
    // andere verweist, gehoert nicht in die Sitemap, sonst schickt man die Suchmaschine
    // absichtlich auf die Zweitfassung.
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/stores`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/bella`, changeFrequency: "daily", priority: 0.9 },
    /* `/themes/wetter/bella` IST RAUS (Owner 11.08.2026: „Wake up with Bella bieten wir nicht
       mehr an"). Sie stand hier mit der höchsten Priorität nach der Startseite und bewarb ein
       Abo, das es nicht mehr zu kaufen gibt — die teuerste Art, Crawl-Budget zu verbrennen.
       Die Seite selbst und die ganze Wetter-Maschine bleiben für Bestandskunden stehen. */

    /**
     * DIE THEMENSEITEN — und sie standen bis zum 05.08.2026 in KEINER Zeile dieser Datei.
     *
     * Das ist die Lücke, die am meisten gekostet hat: Hier stehen `/stores`, `/curators` und
     * `/earnings` — und ausgerechnet die Seiten, auf denen etwas verkauft wird, fehlten. Google
     * findet sie über die Startseite zwar irgendwann, aber „irgendwann" ist bei einem
     * Dezember-Produkt keine Antwort.
     *
     * Jede dieser Seiten hat einen eigenen Titel, eigene Suchwörter und einen eigenen Anlass —
     * genau die Gliederung, nach der laut Keyword-Messung gesucht wird (Konzept §1: „Der
     * Suchende sucht den EMPFÄNGER, nicht das Produkt").
     *
     * `gutschein` steht bewusst zuoberst: Es ist das einzige Geschenk mit GEMESSENER
     * Suchnachfrage („gutschein verpacken ideen", „gutschein text", „gift card message") und
     * das einzige mit einer Frist.
     */
    { url: `${BASE}/themes/gutschein`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/themes/kiss`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/themes/wedding`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/themes/holiday`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/themes/birthday`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/themes/surprise`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/themes/chat`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/themes/versprechen`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/themes/bella`, changeFrequency: "weekly", priority: 0.6 },
    /* `/models-wanted` ist raus (Owner 05.08.2026: „die gibt es nicht mehr, nur fuer den
       Admin"). Eine Seite, die Besucher wegschickt, gehoert nicht in die Sitemap — sonst
       schickt Google weiter Verkehr auf eine Weiterleitung. */
    { url: `${BASE}/own-influencer`, changeFrequency: "weekly", priority: 0.8 },
    /* `/earnings` und `/curators` SIND RAUS (Owner 11.08.2026: „wir nehmen keine Modelle mehr
       auf"). Beide werben um Kuratoren und versprechen ihnen Verdienst — eine Anwerbung, die
       ins Leere läuft, gehört nicht in die Sitemap. Die Seiten bleiben im Code stehen; ob sie
       ganz abgeschaltet werden, ist NICHT entschieden und wäre eine eigene Runde. */
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/imprint`, changeFrequency: "yearly", priority: 0.3 },
  ];

  /**
   * DIE DYNAMISCHEN SEITEN SIND RAUS (Owner 11.08.2026 vor der Search Console: „aufräumen").
   *
   * WAS GEMESSEN WAR: 205 bekannte Adressen, 6 indexiert, 199 abgelehnt — Grund „Gefunden,
   * zurzeit nicht indexiert". Das ist kein Fehler, den man repariert, sondern Googles Urteil
   * über den Wert. Hier standen ~140 Look-Seiten und ~47 Curator-Profile aus der
   * Seeding-Pipeline des alten Trends-Konzepts: dünn, einander gleich, ohne laufendes
   * Geschäft dahinter (wir nehmen keine Modelle mehr auf). Eine Domain, die zu neun Zehnteln
   * daraus besteht, zieht ihre eigenen Verkaufsseiten mit herunter — deshalb meldet die
   * Sitemap ab jetzt NUR noch Seiten, auf denen etwas zu kaufen ist oder die etwas erklären.
   *
   * DIE SEITEN BLEIBEN ERREICHBAR und tragen zusätzlich `robots: noindex` in ihren eigenen
   * Layouts (app/look/[id]/layout.tsx, app/curator/[id]/layout.tsx) — das ist das aktive
   * Signal, sie fallen zu lassen; das Weglassen hier allein wäre nur ein Verschweigen.
   *
   * WEG ZURÜCK: Wer Look-Seiten je als Inhalts-Strategie will, braucht zuerst echten,
   * eigenen Text je Seite. Dann kommen diese Zeilen zurück UND die beiden Layouts weg —
   * in dieser Reihenfolge, sonst meldet man wieder an, was man gerade abmeldet.
   *
   * `readTryThisLookState` und `lookPath` sind damit hier nicht mehr nötig; die Datei liest
   * keinen Zustand mehr und ist eine reine Liste. `revalidate` bleibt trotzdem stehen — die
   * statischen Einträge sollen sich weiter regelmässig erneuern.
   */
  return staticPages;
}
