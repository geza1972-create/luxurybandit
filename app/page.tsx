import ThemesCatalog, { metadata as themenMetadata } from "./themes/page";

export const dynamic = "force-dynamic";

/**
 * DIE ADRESSE SELBST IST DIE STARTSEITE — keine Weiterleitung mehr (Owner 03.08.2026:
 * „wenn ich auf meine Adresse klicke, komme ich auf die model seite").
 *
 * Hier stand `redirect("/themes")`. Fuer den Besucher war das richtig: Er landete auf den
 * Themen. Fuer SUCHMASCHINEN war es der Fehler, den der Owner in Bing gesehen hat.
 *
 * Eine Adresse, die nur weiterleitet, hat keinen eigenen Inhalt — Bing und Google werfen sie
 * deshalb aus dem Verzeichnis und nehmen statt ihrer irgendeine ANDERE Seite der Domain als
 * Marken-Treffer. Genommen wurde /stores, die Model-Galerie: Sie ist eine Client-Seite ohne
 * eigenen Titel, also trug sie den Standardtitel aus dem Wurzel-Layout („Your Dream Model,
 * In Any Look") — und sah damit wie die Startseite aus. Wer den Treffer antippte, kam bei
 * den Models heraus, nicht bei den Geschenken.
 *
 * Jetzt liefert „/" die Themen-Seite direkt aus. Damit hat die blanke Adresse wieder eine
 * eigene Seite mit eigenem Titel, und der Marken-Treffer zeigt dorthin, wo der Trichter ist.
 *
 * /themes bleibt bestehen und zeigt dasselbe — es ist in Menues, Links und alten Anzeigen
 * verdrahtet. Damit die beiden sich im Verzeichnis nicht gegenseitig verduennen, nennt
 * /themes „/" als kanonische Fassung (siehe app/themes/page.tsx).
 */
export const metadata = {
  ...themenMetadata,
  alternates: { canonical: "/" },
};

export default ThemesCatalog;
