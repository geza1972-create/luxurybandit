// Curators who offer a bookable travel journey → their real landing page (marketing +
// checkout). Today only Bella has one; add more curator ids here as new journeys launch.
export const JOURNEY_LANDINGS: Record<string, string> = {
  "curator-1783683672619-td4cy": "/urlaub-mit-bella", // Bella
};

export const journeyLandingHref = (curatorId?: string): string | null =>
  (curatorId && JOURNEY_LANDINGS[curatorId]) || null;
