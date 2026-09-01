import type { JoburiLead } from "@/lib/joburi-leads";

/**
 * KLÄRUNGSANLÄSSE — EIN MUSTER, KEINE SAMMLUNG VON SONDERFÄLLEN (Owner 31.08.2026).
 *
 * „Baue es nicht als Sonderfall für Pflege und Nachtschicht, sondern als allgemeines
 * Muster … Sonst hast du in drei Monaten fünfzehn Einzelregeln."
 *
 * Eine Regel besteht aus zwei Teilen: WANN sie anspringt und WELCHE offene Frage sie stellt.
 * Neue Anlässe kommen als Zeile in dieses Array — nicht als `if` im Trichter und nicht als
 * zweiter Kasten im Admin. Beide lesen nur, was hier steht.
 *
 * DIE FRAGE IST OFFEN, NICHT PRÜFEND (Owner: „Nicht ‚Das passt nicht zusammen', sondern
 * etwas wie: ‚Was würde für dich weniger Stress bedeuten?'"). Der Unterschied entscheidet,
 * was zurückkommt: Eine prüfende Frage erzeugt eine Rechtfertigung, eine offene erzeugt eine
 * Antwort. Und genau diese Antworten sind das, was später eine Firma kauft — niemand sonst
 * weiss, warum deutschsprachige Pflegekräfte in Rumänien wechseln wollen.
 *
 * ES IST KEIN VERDACHT. Was hier anspringt, ist meist völlig stimmig: Nachtdienst in der
 * Pflege ist regelmässig ruhiger als Tagdienst. Deshalb heisst es Anlass und nicht
 * Widerspruch — die Wertung über einen Menschen wäre falsch, die Aufgabe für uns ist richtig.
 */

export type Klaerung = {
  /** Stabile Kennung — sie steht in der gespeicherten Antwort, damit später nachvollziehbar
      bleibt, auf welche Frage der Kandidat geantwortet hat. */
  id: string;
  /** Springt die Regel für diesen Datensatz an? */
  trifft: (l: KlaerungsDaten) => boolean;
  /** Schlüssel des Fragetexts in lib/joburi-texte.ts — in allen drei Sprachen vorhanden. */
  frageSchluessel: "klaerStress" | "klaerGeld" | "klaerGespraech";
  /** Ein Satz für den Admin: worum es bei der Rückfrage geht. */
  anlassAdmin: string;
};

/** Die Felder, aus denen sich ein Anlass ergibt — im Trichter noch lose, im Lead gespeichert. */
export type KlaerungsDaten = {
  motive?: string[];
  belastung?: string[];
  gleichesGehalt?: string;
  situation?: string;
  gespraech?: string;
};

const BELASTEND = ["shifts", "standing", "physical"];

export const KLAERUNGEN: Klaerung[] = [
  {
    id: "stress_belastung",
    /* „Weniger Stress" neben Schicht-, Steh- oder körperlicher Arbeit. Bewusst NICHT bei
       „ich habe Erfahrung mit körperlicher Arbeit": Erfahrung ist keine Bereitschaft. */
    trifft: d =>
      !!d.motive?.some(m => m === "less_stress" || m === "flexibilitate") &&
      !!d.belastung?.some(b => BELASTEND.includes(b)),
    frageSchluessel: "klaerStress",
    anlassAdmin: "Sucht weniger Belastung und ist zugleich zu Schicht- oder körperlicher Arbeit bereit.",
  },
  {
    id: "geld_egal",
    /* Gehalt ist das einzige genannte Motiv — aber er würde auch für dasselbe Geld wechseln.
       Beides kann stimmen („mehr wäre schön, nötig ist es nicht"), sagt aber Verschiedenes
       darüber, was ein Arbeitgeber bieten muss. */
    trifft: d =>
      d.motive?.length === 1 && d.motive[0] === "salary" && d.gleichesGehalt === "yes",
    frageSchluessel: "klaerGeld",
    anlassAdmin: "Nennt nur das Gehalt als Grund, würde aber auch ohne Gehaltserhöhung wechseln.",
  },
  {
    id: "sucht_spricht_nicht",
    /* Sucht aktiv, will aber aktuell eher nicht sprechen. Meist heisst das „nicht mit
       irgendwem" — und dann ist die Antwort darauf die wertvollste Angabe im ganzen Profil. */
    trifft: d => d.situation === "actively_searching" && d.gespraech === "not_now",
    frageSchluessel: "klaerGespraech",
    anlassAdmin: "Sucht aktiv, möchte aktuell aber eher nicht sprechen.",
  },
];

/** Der erste zutreffende Anlass — mehr als einer auf einmal wäre ein Verhör. */
export function ersteKlaerung(d: KlaerungsDaten): Klaerung | null {
  return KLAERUNGEN.find(k => k.trifft(d)) ?? null;
}

/** Für den Admin: der Anlass eines gespeicherten Kandidaten, Altbestand eingeschlossen. */
export function klaerungZuLead(l: JoburiLead): Klaerung | null {
  return ersteKlaerung({
    motive: l.motive ?? l.faktoren,
    belastung: l.belastung,
    gleichesGehalt: l.gleichesGehalt,
    situation: l.situation,
    gespraech: l.gespraech,
  });
}
