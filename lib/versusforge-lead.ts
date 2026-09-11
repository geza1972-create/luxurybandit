import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * DIE ANFRAGEN — EIN FACH JE MANDANT (Owner 08.09.2026: „mein Trichter ist ihr Trichter",
 * „ich brauche ebenso ein Dashboard, was die Kunden auch bekommen").
 *
 * DIE ENTSCHEIDUNG, DIE HIER DRINSTECKT: Die erste Fassung von heute Vormittag legte alle
 * Anfragen flach in EIN Verzeichnis — meine Anfragen. Das wäre in vier Wochen ein Umbau
 * gewesen, sobald der erste Kunde seine eigenen sehen will. Wo die Daten liegen, ist die
 * unumkehrbare Entscheidung; sie wird jetzt getroffen, nicht später bereut.
 *
 * VersusForge selbst ist deshalb kein Sonderfall, sondern **Mandant Nummer eins**. Was ich
 * für mich baue, ist das Kundenprodukt — und es wird nur dann eines, wenn es von Anfang an
 * nicht mir gehört.
 *
 * EINE DATEI JE ANFRAGE, wie im ganzen Haus (`david-limit/`, `versusforge-limit/`). Keine
 * Sammel-Datei: Zwei Anfragen in derselben Sekunde würden einander überschreiben — die
 * erste der „drei Fallen beim Speichern".
 *
 * DER PLAN LIEGT MIT DABEI. Sonst wäre eine Adresse ohne Zusammenhang, und wer zurückruft,
 * müsste fragen „worum ging es noch mal?" — genau der Eindruck, gegen den das Produkt steht.
 *
 * NICHT IN DIE TRICHTER-MESSUNG. Dort liegen Ereignisse, keine Personen.
 */

export { EIGENER_MANDANT, GESPERRTE_NAMEN, mandantSauber } from "@/lib/versusforge-namen";
import { EIGENER_MANDANT, mandantSauber } from "@/lib/versusforge-namen";

export type VersusForgeLead = {
  mail: string;
  ziel: string;
  text: string;
  /**
   * ── DER RÜCKRUF (Owner 10.09.2026: „wir müssen auch einen Rückruf erfragen, eine Beratung.
   * Falls er nicht zurechtkommt") ─────────────────────────────────────────────────────────
   *
   * WOFÜR: Gibt das Gespräch keinen brauchbaren Satz her — weil der Mensch nicht sagen kann,
   * was seinen Betrieb ausmacht —, liefern wir keinen Hook, sondern bieten ein Telefonat an.
   * Dafür braucht der, der anruft, zwei Dinge: einen Namen und eine Nummer.
   *
   * ES BLEIBT EINE GEWÖHNLICHE ANFRAGE, kein zweiter Speicher: Sie liegt in unserem eigenen
   * Ordner, wird im Dashboard gezählt wie jede andere, und `ziel: "beratung"` sagt, worum es
   * geht. Beide Felder sind optional — jede bestehende Anfrage bleibt gültig.
   */
  name?: string;
  telefon?: string;
  url: string;
  sprache: string;
  plan: unknown;
  /**
   * DAS GESPRÄCH SELBST (Owner 08.09.2026: „ich brauche das auch").
   *
   * Ohne die Fragen und Antworten steht im Dashboard eine Adresse und ein Plan — aber nicht
   * der Mensch. Wer zurückruft, muss wissen, was er gesagt hat; sonst beginnt das Gespräch
   * mit „erzählen Sie noch mal", und genau dieser Satz macht alles zunichte, was der Trichter
   * vorher aufgebaut hat.
   */
  runden?: { frage: string; antwort: string }[];
  /**
   * SEIN EIGENER TESTLAUF (Owner 09.09.2026: „er wird es selber testen wollen. Falls er das
   * einem Freund schickt und der macht eine Anfrage, dann bekommt er eine E-Mail").
   *
   * ── WARUM DAS FELD EXISTIEREN MUSS ────────────────────────────────────────────────────────
   *
   * Die erste echte Anfrage ist offen — das ist der Beweis, dass der Trichter arbeitet
   * ([[VF_ANFRAGEN_OFFEN]] in lib/versusforge-schalter.ts). Nur wird JEDER Betrieb zuerst
   * selbst hindurchgehen, um zu sehen, ob es geht. Ohne dieses Feld wäre sein eigener Test
   * die freie Anfrage — und die erste ECHTE, die von seinem Freund, wäre schon verschlossen.
   * Ausgerechnet der Moment, der verkauft, fiele hinter das Schloss.
   *
   * ERKANNT WIRD ES AM GERÄT, mit dem der Trichter angelegt wurde. Kein Test-Knopf, kein
   * Häkchen: Wer prüft, soll genau das sehen, was sein Kunde sieht.
   *
   * TESTS SIND IMMER OFFEN UND ZÄHLEN NICHT MIT. Sie stehen im Dashboard, sichtbar als das,
   * was sie sind — sie zu verstecken wäre falsch, denn er hat sie ja selbst gemacht.
   */
  eigen?: boolean;
  /**
   * ── AUS WELCHER ANZEIGE ER KAM (Owner 09.09.2026: „und wie kann er wissen, was der Kunde
   * anfragt?") ──────────────────────────────────────────────────────────────────────────────
   *
   * SOBALD ER FÜNF HOOKS HAT, IST DAS DIE WICHTIGSTE FRAGE. Fünf Anzeigen laufen, Anfragen
   * kommen — und ohne diese Angabe weiss er nicht, welche davon sie bringt. Er würde alle
   * fünf weiterlaufen lassen, auch die vier, die nichts tun, und bezahlt sie bei Facebook.
   *
   * ES IST DIE NUMMER DES HOOKS, nicht der Satz: Ändert er den Text später, bleibt die
   * Zuordnung trotzdem richtig. Sie kommt aus der Adresse, die er in die Anzeige schreibt
   * (`?h=2`), und steht in keinem Cookie — wer die Anzeige nicht angeklickt hat, trägt sie
   * auch nicht.
   */
  hook?: string;
  zeit: string;
};

export type LeadEintrag = VersusForgeLead & { datei: string };

const ordner = (mandant: string) => `versusforge-lead/${mandantSauber(mandant) || EIGENER_MANDANT}`;

/* Der Name ist absteigend sortierbar (ISO-Zeit) und stösst sich nicht mit anderen. */
const name = () =>
  `${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;

export async function leadSpeichern(mandant: string, lead: VersusForgeLead): Promise<boolean> {
  const pfad = `${ordner(mandant)}/${name()}.json`;
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(lead),
  });
  if (!res.ok) console.error("[versusforge] Anfrage NICHT gespeichert:", res.status, await res.text().catch(() => ""));
  return res.ok;
}

/**
 * Alle Anfragen eines Mandanten, neueste zuerst.
 *
 * ES WIRD JEDE DATEI EINZELN GEHOLT — bei Hunderten ist das zu langsam, und dann gehört
 * hier eine Übersichtsdatei hin. Heute gibt es Dutzende; eine Optimierung, bevor jemand
 * wartet, ist verschwendete Zeit (Hausregel: erst messen, dann optimieren).
 */
export async function leadsLesen(mandant: string, grenze = 200): Promise<LeadEintrag[]> {
  const liste = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prefix: `${ordner(mandant)}/`,
      limit: grenze,
      sortBy: { column: "name", order: "desc" },
    }),
  });
  if (!liste.ok) return [];
  const dateien = (await liste.json().catch(() => [])) as { name?: string }[];
  const namen = (Array.isArray(dateien) ? dateien : [])
    .map(d => String(d?.name ?? ""))
    .filter(n => n.endsWith(".json"));

  const geladen = await Promise.all(
    namen.map(async n => {
      const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(`${ordner(mandant)}/${n}`)}`);
      if (!res.ok) return null;
      try {
        const l = (await res.json()) as VersusForgeLead;
        return { ...l, datei: n } as LeadEintrag;
      } catch { return null; }
    }),
  );
  /* Nach der Zeit IM Eintrag sortieren, nicht nach dem Dateinamen: Bei einem späteren
     Import wäre der Name die falsche Wahrheit. */
  return geladen
    .filter((l): l is LeadEintrag => !!l)
    .sort((a, b) => String(b.zeit ?? "").localeCompare(String(a.zeit ?? "")));
}
