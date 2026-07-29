// Curators who offer a bookable travel journey → their real landing page (marketing +
// checkout). Today only Bella has one; add more curator ids here as new journeys launch.
//
// 29.07.2026 von `/urlaub-mit-bella` auf `/themes/bella` umgehängt. Die alte Seite verkauft
// ein abgeschaltetes Angebot („sie reist FÜR dich", 49 $ pro Tag) — aus Bellas Profil und aus
// dem Home-Feed wurden Besucher also in eine Sackgasse geschickt. `/themes/bella` gibt
// dasselbe Versprechen mit dem lebenden Produkt: er lädt sein Foto hoch und ist mit im Bild.
export const JOURNEY_LANDINGS: Record<string, string> = {
  "curator-1783683672619-td4cy": "/themes/bella", // Bella
};

export const journeyLandingHref = (curatorId?: string): string | null =>
  (curatorId && JOURNEY_LANDINGS[curatorId]) || null;
