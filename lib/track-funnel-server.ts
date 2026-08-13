// SERVER-SEITIGES GEGENSTÜCK ZU `logTunnelEvent` (Owner-Master-Auftrag §32, 13.08.2026).
//
// `logTunnelEvent` in lib/track-funnel.ts ist Browser-Code (liest `window`/`localStorage`)
// und schickt per `fetch` an /api/try-this-look (`action:"event"`). Ein Teil der normierten
// Familie entsteht aber NICHT im Browser, sondern am Server — der Cron/Webhook, der ein
// fertiges Video am Auftrag einträgt (`app/api/kiss-deliver`), oder die Programmseite, die
// beim ersten Aufruf ohne Browser-Umweg selbst den Zustand liest und schreibt
// (`app/api/future-program`). Ein Selbstaufruf der eigenen Route wäre dafür der falsche Weg:
// kein zusätzlicher Netzwerk-Hop nötig (der Server hat den Zustand schon offen), und ein
// Server-zu-Server-Fetch auf die eigene Route bräuchte Host/Cookies, die es in einem
// Cron-Kontext gar nicht gibt.
//
// Deshalb schreibt dieser Helfer DIREKT ins TryThisLook-Zustandsobjekt — dasselbe Feld
// (`state.events`), dieselbe Form wie die Route unter `action:"event"`, nur ohne die
// Geo-/Referrer-Anreicherung (die gibt es bei einem Server-Trigger nicht, es war ja kein
// Browser dabei). `lookId`/`lookName` bekommen denselben Platzhalter wie der alte
// `track()`-Helfer in KissFunnel.tsx (`funnel-${theme}`), damit sich Server- und
// Browser-Ereignisse in Insights unter demselben Produkt-Namen wiederfinden.
import { readTryThisLookState, saveTryThisLookState } from "@/lib/try-this-look-store";
import type { TunnelEvent } from "@/lib/track-funnel";

export async function logTunnelEventServer(
  event: TunnelEvent,
  theme: string,
  extra: Record<string, string> = {},
): Promise<void> {
  try {
    const state = await readTryThisLookState();
    state.events.unshift({
      id: `${Date.now()}-${crypto.randomUUID()}`,
      name: event,
      lookId: `funnel-${theme}`,
      lookName: `${theme}-Trichter`,
      campaignId: `funnel-${theme}`,
      createdAt: new Date().toISOString(),
      ...extra,
    });
    await saveTryThisLookState(state);
  } catch {
    /* Analytics darf einen echten, bezahlten Auftrag nie zum Scheitern bringen — siehe
       dieselbe Regel im Browser-Helfer (lib/track-funnel.ts). */
  }
}
